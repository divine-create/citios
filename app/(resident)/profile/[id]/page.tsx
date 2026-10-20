import Link from 'next/link';
import { ArrowLeft, UserX, MapPin, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { db } from '@/src/prisma/db';
import { FallbackImg, getTwoLetterInitials, getAvatarGradient, Pill } from '@/components/cityos/CityUI';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let person: any = null;
  let publicPosts: any[] = [];

  try {
    person = await db.orm.public.Person.where({ id }).include('profile').include('homeCity').first();
    if (person) {
      publicPosts = await db.orm.public.Post
        .where({ personId: id, status: 'PUBLISHED' })
        .all();
    }
  } catch (err) {
    console.error('[ProfileDetailPage] Error loading resident:', err);
  }

  if (!person) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20 p-4">
        <div className="flex items-center gap-4 py-4 border-b border-slate-100">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg">Resident Profile</h1>
        </div>
        <div className="p-10 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-slate-900">Resident Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            This user profile does not exist or has been removed.
          </p>
          <Link
            href="/"
            className="mt-2 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 transition-colors"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Resident';
  const cityName = person.homeCity?.name || 'Calabar';
  const joinedYear = person.createdAt ? new Date(person.createdAt).getFullYear() : 2026;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20 p-4">
      <div className="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Resident Profile</h1>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4 text-center">
        <FallbackImg
          src={person.profile?.avatarUrl as string | undefined}
          alt={fullName}
          className="w-24 h-24 rounded-full object-cover border border-slate-100"
          icon={<span className="text-white font-black text-2xl select-none">{getTwoLetterInitials(fullName)}</span>}
          gradient={getAvatarGradient(fullName)}
        />
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              {cityName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Member since {joinedYear}
            </span>
          </div>
          <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider pt-1">
            Verified Resident
          </p>
        </div>
      </div>

      {/* Community Posts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-ink uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-700" />
            Community Posts ({publicPosts.length})
          </h3>
        </div>

        {publicPosts.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-1.5">
            <p className="text-xs font-black text-ink">No public posts yet</p>
            <p className="text-[11px] text-slate-400">
              When {person.firstName || 'this resident'} shares updates to the city feed, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {publicPosts.map((post) => (
              <Link
                key={post.id}
                href={`/feed/${post.id}`}
                className="block p-4 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-xs transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill tone="green">{post.category || 'General'}</Pill>
                      <span className="text-[10px] text-slate-400">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-ink group-hover:text-teal-800 transition-colors truncate">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-teal-800 shrink-0 mt-1 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
