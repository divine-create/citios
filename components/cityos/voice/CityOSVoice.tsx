'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';
import { AgentSessionConfig } from '@/lib/voice/types';

interface CityOSVoiceProps {
  onTranscript: (role: 'user' | 'cityos', text: string, isFinal: boolean) => void;
  onClose: () => void;
}

type VoiceState = 'idle' | 'requesting' | 'connecting' | 'connected' | 'error';

export function CityOSVoice({ onTranscript, onClose }: CityOSVoiceProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    if (!playbackContextRef.current) return;
    
    // Decode base64 to binary
    const binaryStr = atob(base64Audio);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // The AssemblyAI output is PCM16 24kHz Mono
    const sampleRate = 24000;
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = playbackContextRef.current.createBuffer(1, float32.length, sampleRate);
    audioBuffer.copyToChannel(float32, 0);

    const source = playbackContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playbackContextRef.current.destination);

    const currentTime = playbackContextRef.current.currentTime;
    const startTime = Math.max(nextStartTimeRef.current, currentTime);
    
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const startSession = async () => {
    try {
      setState('requesting');
      setErrorMsg(null);
      cleanup();

      // 1. Init audio contexts synchronously in click handler
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = actx;
      
      const pctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      playbackContextRef.current = pctx;
      nextStartTimeRef.current = 0;

      // 2. Get Mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        throw new Error('Microphone access is unavailable. Please check your browser permissions.');
      });
      mediaStreamRef.current = stream;

      // 3. Get Token
      setState('connecting');
      const tokenRes = await fetch('/api/voice/token');
      if (!tokenRes.ok) throw new Error("We couldn't start CityOS Voice. Please try again.");
      const { token } = await tokenRes.json();

      // 3. Get Tools dynamically
      const toolsRes = await fetch('/api/voice/tools');
      const toolsData = await toolsRes.json();
      const dynamicTools = toolsData.tools || [];

      // 4. Setup WebSocket
      const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send session.update
        const config: AgentSessionConfig = {
          system_prompt: "You are CityOS Voice, the voice interface for CityOS. You help residents interact with CityOS naturally through conversation. You are concise, conversational, helpful, and clear. You have tools to search the city, products, businesses, and restaurants. Use them whenever a resident asks for information instead of inventing answers. If a search fails, explain the failure. If an ambiguous request is made, ask a clarification question. Maintain context across tool calls. You also have tools to check order and delivery statuses.",
          greeting: "Hi, I'm CityOS. How can I help?",
          output: { type: "audio" },
          tools: dynamicTools
        };
        ws.send(JSON.stringify({ type: 'session.update', session: config }));
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        
        switch (msg.type) {
          case 'session.ready':
            setState('connected');
            
            // Resume contexts if suspended
            if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
            if (playbackContextRef.current?.state === 'suspended') await playbackContextRef.current.resume();

            // Init audio capture
            if (audioContextRef.current && mediaStreamRef.current) {
              const currentActx = audioContextRef.current;
              await currentActx.audioWorklet.addModule('/pcm-processor.js');
              const source = currentActx.createMediaStreamSource(mediaStreamRef.current);
              const worklet = new AudioWorkletNode(currentActx, 'pcm-processor');
              workletNodeRef.current = worklet;
              
              worklet.port.onmessage = (event) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  const pcm16 = event.data as Int16Array;
                  const buffer = new ArrayBuffer(pcm16.length * 2);
                  const view = new DataView(buffer);
                  for (let i = 0; i < pcm16.length; i++) {
                    view.setInt16(i * 2, pcm16[i], true); // little-endian
                  }
                  const uint8 = new Uint8Array(buffer);
                  let binary = '';
                  for (let i = 0; i < uint8.byteLength; i++) {
                    binary += String.fromCharCode(uint8[i]);
                  }
                  const base64 = btoa(binary);
                  wsRef.current.send(JSON.stringify({ type: 'input.audio', audio: base64 }));
                }
              };
              
              source.connect(worklet);
              worklet.connect(currentActx.destination);
            }
            break;

          case 'user_transcript':
            if (msg.text) {
              onTranscript('user', msg.text, msg.is_final);
            }
            break;

          case 'agent_transcript':
            if (msg.text) {
              onTranscript('cityos', msg.text, msg.is_final);
            }
            break;

          case 'reply.audio':
            setIsSpeaking(true);
            if (msg.data) {
              playAudioChunk(msg.data);
            }
            break;

          case 'reply.done':
            setIsSpeaking(false);
            if (msg.status === 'interrupted') {
              // Interruption handling
              if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = new window.AudioContext({ sampleRate: 24000 });
                nextStartTimeRef.current = 0;
              }
            }
            break;

          case 'tool.call': {
            const callId = msg.call_id || msg.tool_call_id;
            const toolName = msg.name;
            const toolArgs = typeof msg.arguments === 'string' ? JSON.parse(msg.arguments || '{}') : (msg.arguments || {});

            setIsExecutingTool(true);
            
            fetch('/api/voice/tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: toolName, arguments: toolArgs })
            })
            .then(res => res.json())
            .then(data => {
              setIsExecutingTool(false);
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'tool.result',
                  call_id: callId,
                  result: typeof data === 'string' ? data : JSON.stringify(data)
                }));
              }
            })
            .catch(err => {
              console.error('Tool execution failed client-side:', err);
              setIsExecutingTool(false);
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'tool.result',
                  call_id: callId,
                  result: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to execute tool on the server.' })
                }));
              }
            });
            break;
          }

          case 'error':
            console.error('Agent Error:', msg);
            if (state !== 'connected') {
               setErrorMsg('The voice connection was interrupted. You can try again.');
               cleanup();
               setState('error');
            }
            break;
        }
      };

      ws.onerror = () => {
        setErrorMsg('The voice connection was interrupted. You can try again.');
        cleanup();
        setState('error');
      };
      
      ws.onclose = () => {
        if (state === 'connected' || state === 'connecting') {
           cleanup();
           setState('idle');
        }
      };

    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'An unexpected error occurred.');
      setState('error');
      cleanup();
    }
  };

  const handleStop = () => {
    cleanup();
    setState('idle');
    onClose();
  };

  if (state === 'idle') {
    return (
      <div className="flex justify-center p-4">
        <button 
          onClick={startSession}
          className="flex items-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-700 text-white rounded-full font-bold shadow-lg transition-all"
        >
          <Mic className="w-5 h-5" />
          Talk to CityOS
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-slate-50 rounded-2xl border border-slate-100">
      
      {state === 'error' && (
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm font-medium px-4">{errorMsg}</p>
          <button 
            onClick={startSession}
            className="text-teal-800 text-sm font-bold hover:underline"
          >
            Try Again
          </button>
          <button 
            onClick={handleStop}
            className="text-slate-500 text-sm font-bold hover:underline block w-full"
          >
            Cancel
          </button>
        </div>
      )}

      {(state === 'connecting' || state === 'requesting') && (
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-teal-800 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {state === 'requesting' ? 'Requesting microphone...' : 'Connecting...'}
          </p>
        </div>
      )}

      {state === 'connected' && (
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
              isSpeaking ? 'bg-gradient-to-br from-orange-400 to-orange-600 scale-110' : 'bg-gradient-to-br from-teal-800 to-teal-500 scale-100'
            }`}>
              <Sparkles className={`w-10 h-10 ${isSpeaking ? 'animate-pulse' : ''}`} />
            </div>
            
            {!isSpeaking && (
              <div className="absolute inset-0 rounded-full border-4 border-teal-500/30 animate-ping" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-black text-ink">
              {isExecutingTool ? 'Thinking...' : isSpeaking ? 'CityOS is speaking...' : 'Listening...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              You can interrupt at any time
            </p>
          </div>

          <button 
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-bold text-sm transition-all"
          >
            <Square className="w-4 h-4" />
            Stop Session
          </button>
        </div>
      )}
    </div>
  );
}
