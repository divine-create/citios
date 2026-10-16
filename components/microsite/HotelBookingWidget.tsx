"use client";

import React, { useState } from "react";
import { CalendarDays, Users, Search, CheckCircle2, ArrowRight } from "lucide-react";

export default function HotelBookingWidget({ theme, heading, subtext, availableRooms = [] }: { theme: any, heading?: string, subtext?: string, availableRooms?: any[] }) {
  const [step, setStep] = useState<"SEARCH" | "RESULTS" | "DETAILS">("SEARCH");

  const isLuxury = theme.label === "Horizon (Hotel)";

  const primaryBtnStyle = {
    background: theme.accent,
    color: theme.accentText,
    padding: "0.875rem 2rem",
    borderRadius: theme.radius,
    fontWeight: isLuxury ? 500 : "bold",
    textTransform: isLuxury ? "uppercase" as any : "none",
    letterSpacing: isLuxury ? "0.05em" : "normal",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "all 0.2s"
  };

  const inputStyle = {
    width: "100%",
    padding: "0.875rem 1rem",
    borderRadius: theme.radius,
    border: isLuxury ? `1px solid rgba(255,255,255,0.15)` : `1px solid ${theme.textMuted}40`,
    background: isLuxury ? "rgba(0,0,0,0.4)" : theme.bg,
    color: theme.text,
    fontFamily: theme.bodyFont,
    backdropFilter: isLuxury ? "blur(10px)" : "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.65rem",
    fontWeight: isLuxury ? 600 : "bold",
    color: isLuxury ? "rgba(255,255,255,0.7)" : theme.textMuted,
    marginBottom: "0.5rem",
    textTransform: "uppercase" as any,
    letterSpacing: "0.1em"
  };

  // Display actual available rooms from the database
  const displayRooms = availableRooms || [];
  const [isBooked, setIsBooked] = useState(false);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", background: isLuxury ? "transparent" : theme.surface, borderRadius: theme.radius, padding: isLuxury ? "0" : "2rem", boxShadow: isLuxury ? "none" : "0 20px 40px rgba(0,0,0,0.1)" }}>
      {heading && !isLuxury && <h3 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: "bold", marginBottom: "0.5rem", color: theme.text }}>{heading}</h3>}
      {subtext && !isLuxury && <p style={{ textAlign: "center", color: theme.textMuted, marginBottom: "2rem" }}>{subtext}</p>}

      {step === "SEARCH" && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isLuxury ? "1fr 1fr 1fr auto" : "1fr 1fr 1fr auto", 
          gap: isLuxury ? "0.5rem" : "1rem", 
          alignItems: "end",
          background: isLuxury ? "rgba(20,20,20,0.8)" : "transparent",
          backdropFilter: isLuxury ? "blur(20px)" : "none",
          padding: isLuxury ? "1.5rem" : "0",
          border: isLuxury ? "1px solid rgba(255,255,255,0.05)" : "none",
          borderRadius: theme.radius,
          boxShadow: isLuxury ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "none"
        }}>
          <div>
            <label style={labelStyle}>Check-In</label>
            <input type="date" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Check-Out</label>
            <input type="date" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Guests</label>
            <select style={inputStyle}>
              <option>1 Adult</option>
              <option>2 Adults</option>
              <option>2 Adults, 1 Child</option>
            </select>
          </div>
          <button style={primaryBtnStyle} onClick={() => setStep("RESULTS")}>
            <Search size={18} /> Check
          </button>
        </div>
      )}

      {step === "RESULTS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <p style={{ fontWeight: "bold" }}>Available Rooms for Selected Dates</p>
            <button onClick={() => setStep("SEARCH")} style={{ background: "transparent", border: "none", color: theme.accent, cursor: "pointer", fontWeight: "bold" }}>Change Dates</button>
          </div>
          
          {displayRooms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", background: theme.bg, borderRadius: theme.radius, border: `1px dashed ${theme.textMuted}40` }}>
              <p style={{ fontWeight: "bold", fontSize: "1.1rem", color: theme.text, marginBottom: "0.5rem" }}>No rooms available online for these dates</p>
              <p style={{ fontSize: "0.85rem", color: theme.textMuted }}>Please try alternative dates or contact the front desk directly.</p>
            </div>
          ) : (
            displayRooms.map(room => (
              <div key={room.type || room.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", background: theme.bg, borderRadius: theme.radius, border: `1px solid ${theme.textMuted}20` }}>
                <div>
                  <h4 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.25rem" }}>{room.type || room.name}</h4>
                  <p style={{ fontSize: "0.85rem", color: theme.textMuted }}>Book direct for best guaranteed rate</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: "1.5rem", fontWeight: "900", color: theme.text }}>₦{Number(room.rate || room.baseRate || 0).toLocaleString()}</span>
                    <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>/ night</span>
                  </div>
                  <button style={primaryBtnStyle} onClick={() => setStep("DETAILS")}>
                    Select
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {step === "DETAILS" && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          {isBooked ? (
            <div>
              <CheckCircle2 size={48} style={{ color: "#10b981", margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Reservation Request Received</h3>
              <p style={{ color: theme.textMuted, marginBottom: "2rem" }}>The front desk has received your request. You will receive booking confirmation and check-in instructions shortly.</p>
              <button onClick={() => { setStep("SEARCH"); setIsBooked(false); }} style={{ padding: "0.75rem 1.5rem", borderRadius: theme.radius, background: theme.accent, color: theme.accentText, border: "none", cursor: "pointer", fontWeight: "bold" }}>Done</button>
            </div>
          ) : (
            <div>
              <CheckCircle2 size={48} style={{ color: theme.accent, margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Complete Your Booking</h3>
              <p style={{ color: theme.textMuted, marginBottom: "2rem" }}>Confirm your stay and payment preference.</p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button onClick={() => setStep("RESULTS")} style={{ padding: "0.75rem 1.5rem", borderRadius: theme.radius, background: "transparent", border: `1px solid ${theme.textMuted}40`, color: theme.text, cursor: "pointer", fontWeight: "bold" }}>Back</button>
                <button style={primaryBtnStyle} onClick={() => setIsBooked(true)}>Confirm Reservation</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
