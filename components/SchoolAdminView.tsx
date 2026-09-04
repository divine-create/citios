'use client';
import { Users, Bell, FileText, Plus, CheckCircle, Clock, LayoutDashboard, CalendarCheck, BookOpen, MoreVertical, Search, CheckCircle2, XCircle, Briefcase, Wallet, Bus, Library, Calendar } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import { useState } from 'react';

export default function SchoolAdminView({ initialData }: { initialData?: any }) {
    const [activeTab, setActiveTab] = useState('overview');

    const school = initialData?.school || { name: 'Lincoln High School' };
    const students = initialData?.students || [];
    const courses = initialData?.courses || [];
    const attendanceRecords = initialData?.attendanceRecords || [];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
        { id: 'academics', label: 'Academics', icon: BookOpen },
        { id: 'staff', label: 'Staff & HR', icon: Briefcase },
        { id: 'finances', label: 'Finances', icon: Wallet },
        { id: 'transport', label: 'Transport', icon: Bus },
        { id: 'library', label: 'Library', icon: Library },
        { id: 'timetable', label: 'Timetable', icon: Calendar },
    ];

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header & Quick Stats */}
            <div className="flex flex-col md:flex-row gap-6">
                <Card className="flex-1 bg-teal-900 border-none text-white relative overflow-hidden p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-white/10 rounded-bl-full -z-0" />
                    <div className="relative z-10 flex justify-between items-start mb-6 md:mb-10">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{school.name}</h2>
                            <p className="text-teal-200 text-xs md:text-sm font-bold uppercase tracking-widest mt-2">Admin Portal • Principal Access</p>
                        </div>
                        <Badge className="bg-teal-800 text-teal-100 border-teal-700 shadow-sm hidden md:inline-flex">Verified Hub</Badge>
                    </div>
                    <div className="relative z-10 grid grid-cols-3 gap-4 md:gap-8 border-t border-teal-800/50 pt-6 md:pt-8">
                        <div>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter text-white">{students.length}</p>
                            <p className="text-[9px] md:text-xs text-teal-300 font-bold uppercase tracking-wider mt-1 md:mt-2">Active Students</p>
                        </div>
                        <div>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter text-white">84</p>
                            <p className="text-[9px] md:text-xs text-teal-300 font-bold uppercase tracking-wider mt-1 md:mt-2">Staff On-Site</p>
                        </div>
                        <div>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter text-orange-400">3</p>
                            <p className="text-[9px] md:text-xs text-teal-300 font-bold uppercase tracking-wider mt-1 md:mt-2">Active Alerts</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'bg-teal-800 text-white shadow-sm' 
                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 animate-in fade-in duration-300">
                    {/* Left Column: Communications */}
                    <div className="flex-1 space-y-4 md:space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Community Broadcasts</h3>
                        </div>

                        <Card className="p-0 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50">
                                <h4 className="font-bold text-sm text-slate-900 mb-3">Draft New Broadcast</h4>
                                <textarea 
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 md:p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-800 transition-all placeholder:text-slate-400 mb-4 font-medium resize-none shadow-sm"
                                    rows={3}
                                    placeholder="Enter message to broadcast to the local community feed..."
                                ></textarea>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Badge variant="neutral" className="cursor-pointer hover:bg-slate-200 bg-slate-200 shadow-inner flex-1 sm:flex-none text-center justify-center">General Notice</Badge>
                                        <Badge variant="alert" className="cursor-pointer opacity-50 hover:opacity-100 flex-1 sm:flex-none text-center justify-center">Urgent Alert</Badge>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4" /> Publish to Feed</Button>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <div className="p-4 md:p-6 flex justify-between items-start hover:bg-slate-50 transition-colors">
                                    <div className="pr-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="alert">Alert</Badge>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3 hrs ago</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium leading-relaxed">Due to sudden heating system maintenance, Lincoln High will dismiss students early at 1:00 PM today. Buses will be rerouted accordingly.</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-slate-900 mb-1">1.2k Views</p>
                                        <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Active</p>
                                    </div>
                                </div>
                                <div className="p-4 md:p-6 flex justify-between items-start hover:bg-slate-50 transition-colors">
                                    <div className="pr-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="neutral">Notice</Badge>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2 days ago</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium leading-relaxed">Parent-teacher conferences are scheduled for next Thursday. Please book your slots via the city portal to secure your preferred times.</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-slate-900 mb-1">842 Views</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Archived</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Applications & Staff */}
                    <div className="lg:w-80 xl:w-96 space-y-4 md:space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Enrollment Requests</h3>
                            <Button variant="outline" size="sm" className="bg-white h-7 px-3 text-[10px]">View All</Button>
                        </div>

                        <Card className="p-4 md:p-6">
                            <div className="space-y-2">
                                {[
                                    { name: "Emily Chen", grade: "Grade 9", status: "Pending Docs", time: "2 hrs ago" },
                                    { name: "Marcus Johnson", grade: "Grade 11", status: "Under Review", time: "5 hrs ago" },
                                    { name: "Sarah Williams", grade: "Grade 10", status: "Approved", time: "1 day ago" },
                                    { name: "David Kim", grade: "Grade 9", status: "Approved", time: "2 days ago" },
                                ].map((req, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center font-bold text-xs">{req.name.split(' ').map(n => n[0]).join('')}</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{req.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{req.grade}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {req.status === 'Approved' ? (
                                                <CheckCircle className="w-5 h-5 text-teal-600 inline-block" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-orange-500 inline-block" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full mt-4 bg-white border-slate-200">Export Roster</Button>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search students..." 
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-800 transition-all"
                                />
                            </div>
                            <Button variant="primary" size="sm" className="whitespace-nowrap"><Plus className="w-4 h-4" /> Add Student</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Grade</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Guardian</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.map((s: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-xs">{s.firstName[0]}{s.lastName[0]}</div>
                                                {s.firstName} {s.lastName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">{s.id.split('-')[0]}...</td>
                                            <td className="px-6 py-4 text-slate-700 font-medium">{s.gradeLevel}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="default">Active</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">Guardian</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-teal-600 transition-colors"><MoreVertical className="w-5 h-5 inline-block" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-900">Today's Attendance</h3>
                        <div className="flex gap-2">
                            <Badge variant="default" className="bg-teal-50 text-teal-700 border-teal-200">{attendanceRecords.filter((r: any) => r.status === 'PRESENT').length} Present</Badge>
                            <Badge variant="alert" className="bg-orange-50 text-orange-700 border-orange-200">{attendanceRecords.filter((r: any) => r.status === 'ABSENT').length} Absent</Badge>
                        </div>
                    </div>
                    <Card className="p-0 overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {attendanceRecords.map((record: any, i: number) => (
                                <div key={i} className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">{record.student.firstName[0]}{record.student.lastName[0]}</div>
                                        <div>
                                            <p className="font-bold text-slate-900">{record.student.firstName} {record.student.lastName}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{record.student.gradeLevel}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                                        <button className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${record.status === 'PRESENT' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Present</button>
                                        <button className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${record.status === 'LATE' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Late</button>
                                        <button className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${record.status === 'ABSENT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Absent</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                            <Button variant="outline" className="bg-white text-slate-600">Load More Students</Button>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'academics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    {courses.map((c: any, i: number) => (
                        <Card key={i} hoverable className="p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Room: {c.roomNumber || 'TBD'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 font-black text-lg border border-teal-100 shadow-sm shrink-0">
                                    A
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-4">
                                <span className="text-sm font-medium text-slate-600">Active Enrollments</span>
                                <Button variant="outline" size="sm" className="bg-white text-xs border-slate-200">View Grades</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {activeTab === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search staff & faculty..." 
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-800 transition-all"
                                />
                            </div>
                            <Button variant="primary" size="sm" className="whitespace-nowrap"><Plus className="w-4 h-4" /> Add Staff Member</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4">Employee Name</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { name: "Dr. Robert Smith", role: "Head of Math", dept: "Mathematics", status: "Active" },
                                        { name: "Sarah Jenkins", role: "Senior Teacher", dept: "History", status: "On Leave" },
                                        { name: "Alan Turing", role: "Teacher", dept: "Science", status: "Active" },
                                        { name: "Jane Austen", role: "Teacher", dept: "English", status: "Active" },
                                    ].map((s, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">{s.name.split(' ').map(n=>n[0]).join('')}</div>
                                                {s.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-700 font-medium">{s.role}</td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">{s.dept}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant={s.status === 'Active' ? 'default' : 'neutral'}>{s.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-teal-600 transition-colors"><MoreVertical className="w-5 h-5 inline-block" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'finances' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-teal-900 text-white border-none">
                            <h3 className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-2">Total Collected (YTD)</h3>
                            <p className="text-3xl font-black tracking-tighter">$1.2M</p>
                        </Card>
                        <Card className="p-6 border border-slate-200 bg-white">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Pending Dues</h3>
                            <p className="text-3xl font-black tracking-tighter text-slate-900">$45,200</p>
                        </Card>
                        <Card className="p-6 border border-slate-200 bg-white">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Recent Expenses</h3>
                            <p className="text-3xl font-black tracking-tighter text-slate-900">$12,400</p>
                        </Card>
                    </div>
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Transactions</h3>
                        <div className="divide-y divide-slate-100">
                            {[
                                { desc: "Tuition Fee - Grade 10", amount: "+$2,500", date: "Today, 10:23 AM", status: "Paid", type: "income" },
                                { desc: "Lab Equipment Purchase", amount: "-$4,200", date: "Yesterday", status: "Completed", type: "expense" },
                                { desc: "Tuition Fee - Grade 9", amount: "+$2,500", date: "Oct 12", status: "Paid", type: "income" },
                                { desc: "Library Books Restock", amount: "-$850", date: "Oct 10", status: "Completed", type: "expense" },
                            ].map((t, i) => (
                                <div key={i} className="py-3 flex justify-between items-center hover:bg-slate-50 transition-colors -mx-6 px-6 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{t.desc}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-slate-900'}`}>{t.amount}</p>
                                        <Badge variant="neutral" className="mt-1">{t.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'transport' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    {[
                        { route: "Route A - North Suburbs", driver: "Mike H.", students: 42, status: "On Time" },
                        { route: "Route B - East City", driver: "Sarah W.", students: 38, status: "Delayed" },
                        { route: "Route C - West End", driver: "Tom B.", students: 45, status: "Completed" },
                        { route: "Route D - Downtown", driver: "Lisa K.", students: 30, status: "On Time" },
                    ].map((r, i) => (
                        <Card key={i} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Bus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900">{r.route}</h3>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">Driver: {r.driver}</p>
                                    </div>
                                </div>
                                <Badge variant={r.status === 'Completed' ? 'neutral' : (r.status === 'Delayed' ? 'alert' : 'default')}>{r.status}</Badge>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{r.students} Students</span>
                                <Button variant="outline" size="sm" className="bg-white text-[10px] h-7 px-3">Live Tracking</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {activeTab === 'library' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search catalog..." 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-800 transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="neutral" className="bg-white">12,450 Total Books</Badge>
                            <Badge variant="alert" className="bg-white text-orange-600 border-orange-200">142 Overdue</Badge>
                        </div>
                    </div>
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-900">Recent Lending Activity</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {[
                                { book: "Advanced Physics Vol 2", student: "Alex Johnson", date: "Due in 3 days", status: "Issued" },
                                { book: "History of the Modern World", student: "Zoe Smith", date: "Overdue by 2 days", status: "Overdue" },
                                { book: "Introduction to Calculus", student: "Liam Davis", date: "Returned today", status: "Returned" },
                                { book: "The Great Gatsby", student: "Emma Wilson", date: "Due in 7 days", status: "Issued" },
                            ].map((l, i) => (
                                <div key={i} className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{l.book}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Issued to: {l.student}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={l.status === 'Returned' ? 'neutral' : (l.status === 'Overdue' ? 'alert' : 'default')} className="mb-1">{l.status}</Badge>
                                        <p className="text-[10px] text-slate-500 font-medium">{l.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'timetable' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-slate-900">Master Schedule</h3>
                            <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-800">
                                <option>Grade 10 - Section A</option>
                                <option>Grade 10 - Section B</option>
                                <option>Grade 11 - Section A</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3 border-r border-slate-100 w-24">Time</th>
                                        <th className="px-4 py-3 border-r border-slate-100">Monday</th>
                                        <th className="px-4 py-3 border-r border-slate-100">Tuesday</th>
                                        <th className="px-4 py-3 border-r border-slate-100">Wednesday</th>
                                        <th className="px-4 py-3 border-r border-slate-100">Thursday</th>
                                        <th className="px-4 py-3">Friday</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { time: "08:00 AM", m: "Math", t: "Science", w: "English", th: "History", f: "Math" },
                                        { time: "09:00 AM", m: "Science", t: "Math", w: "History", th: "English", f: "Science" },
                                        { time: "10:00 AM", m: "Break", t: "Break", w: "Break", th: "Break", f: "Break" },
                                        { time: "10:30 AM", m: "Art", t: "PE", w: "Math", th: "Science", f: "PE" },
                                        { time: "11:30 AM", m: "English", t: "History", w: "Science", th: "Math", f: "Art" },
                                    ].map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-3 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase">{row.time}</td>
                                            <td className={`px-4 py-3 border-r border-slate-100 font-bold ${row.m === 'Break' ? 'bg-slate-50 text-slate-400 text-center text-[10px] uppercase tracking-widest' : 'text-slate-700'}`}>{row.m}</td>
                                            <td className={`px-4 py-3 border-r border-slate-100 font-bold ${row.t === 'Break' ? 'bg-slate-50 text-slate-400 text-center text-[10px] uppercase tracking-widest' : 'text-slate-700'}`}>{row.t}</td>
                                            <td className={`px-4 py-3 border-r border-slate-100 font-bold ${row.w === 'Break' ? 'bg-slate-50 text-slate-400 text-center text-[10px] uppercase tracking-widest' : 'text-slate-700'}`}>{row.w}</td>
                                            <td className={`px-4 py-3 border-r border-slate-100 font-bold ${row.th === 'Break' ? 'bg-slate-50 text-slate-400 text-center text-[10px] uppercase tracking-widest' : 'text-slate-700'}`}>{row.th}</td>
                                            <td className={`px-4 py-3 font-bold ${row.f === 'Break' ? 'bg-slate-50 text-slate-400 text-center text-[10px] uppercase tracking-widest' : 'text-slate-700'}`}>{row.f}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
