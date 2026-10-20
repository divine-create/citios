import Link from 'next/link';
import { ArrowLeft, UserX } from 'lucide-react';
import { db } from '@/src/prisma/db';
import { FallbackImg, getTwoLetterInitials, getAvatarGradient } from '@/components/cityos/CityUI';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let person: any = null;

  try {
    person = await db.orm.public.Person.where({ id }).include('profile').first();
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20 p-4">
      <div className="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Resident Profile</h1>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
        <FallbackImg
          src={person.profile?.avatarUrl as string | undefined}
          alt={fullName}
          className="w-24 h-24 rounded-full object-cover border border-slate-100"
          icon={<span className="text-white font-black text-2xl select-none">{getTwoLetterInitials(fullName)}</span>}
          gradient={getAvatarGradient(fullName)}
        />
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
          <p className="text-slate-500 text-sm">Resident</p>
        </div>

        <div className="w-full mt-4 p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
          This profile is private. User posts will appear here in the future.
        </div>
      </div>
    </div>
  );
}
