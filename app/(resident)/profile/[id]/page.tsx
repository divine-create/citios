import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/src/prisma/db';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const person = await db.orm.public.Person.where({ id }).include('profile').first();
    
    if (!person) {
        return <div className="text-center py-20">User not found</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20">
            <div className="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="font-bold text-lg">Resident Profile</h1>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                {person.profile?.avatarUrl ? (
                    <img src={person.profile.avatarUrl as string} alt={person.firstName} className="w-24 h-24 rounded-full object-cover" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-black text-slate-600">
                        {person.firstName.charAt(0)}
                    </div>
                )}
                <div className="text-center">
                    <h2 className="text-xl font-black text-slate-900">{person.firstName} {person.lastName}</h2>
                    <p className="text-slate-500">Resident</p>
                </div>
                
                <div className="w-full mt-4 p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                    This profile is private. User posts will appear here in the future.
                </div>
            </div>
        </div>
    );
}
