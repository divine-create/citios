"use client";

import { useState } from "react";
import { UserPlus, Search, Edit2, Trash2, X, GraduationCap, BookOpen, ClipboardList, DollarSign, Library, Users2, Briefcase } from "lucide-react";
import {
  createStudent,
  createStaff,
  updateStudent,
  deleteStudent,
  updateStaff,
  deleteStaff,
  createParentLink,
  updateParentLink,
  deleteParentLink,
} from "@/lib/actions/school";

export type TabId = "students" | "teachers" | "admission" | "accountant" | "librarian" | "parents" | "staff";

interface UsersManagerProps {
  organizationId: string;
  activeTab: TabId;
  students: any[];
  staff: any[];
  parents: any[];
  grades: any[];
  classSections: any[];
  refresh: () => void;
}

// Tabs backed by a specific OrgRole — the Add form skips the role picker and
// forces this role directly. "staff" has no entry here: it's the catch-all
// for any role not named below (Admin, Counselor, Manager, Owner...).
const ROLE_TABS: Partial<Record<TabId, string>> = {
  teachers: "TEACHER",
  admission: "REGISTRAR",
  accountant: "FINANCE",
  librarian: "LIBRARIAN",
};

const TAB_LABELS: Record<TabId, string> = {
  students: "Students",
  teachers: "Teachers",
  admission: "Admission",
  accountant: "Accountant",
  librarian: "Librarian",
  parents: "Parents",
  staff: "Other Staff",
};

export const USERS_TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "students", label: "Students", icon: GraduationCap },
  { id: "teachers", label: "Teachers", icon: BookOpen },
  { id: "admission", label: "Admission", icon: ClipboardList },
  { id: "accountant", label: "Accountant", icon: DollarSign },
  { id: "librarian", label: "Librarian", icon: Library },
  { id: "parents", label: "Parents", icon: Users2 },
  { id: "staff", label: "Other Staff", icon: Briefcase },
];

export default function UsersManager({ organizationId, activeTab, students, staff, parents, grades, classSections, refresh }: UsersManagerProps) {
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    role: "ADMIN" as any,
    studentDataId: "",
    gender: "",
    yearLevel: 1,
    gradeId: "",
    classSectionId: "",
    dateOfBirth: "",
  });

  // Parent form (separate shape: links an existing/new person to a student)
  const [parentForm, setParentForm] = useState({
    name: "",
    email: "",
    studentDataId: students[0]?.id ?? "",
    relationship: "",
    isPrimary: false,
  });

  const namedRoleTabs: TabId[] = ["teachers", "admission", "accountant", "librarian"];
  const namedRoles = Object.values(ROLE_TABS);
  const otherStaff = staff.filter((s) => !namedRoles.includes(s.role));
  const staffByTab = (tab: TabId) => staff.filter((s) => s.role === ROLE_TABS[tab]);

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      role: (ROLE_TABS[activeTab] as any) ?? "ADMIN",
      studentDataId: "",
      gender: "",
      yearLevel: 1,
      gradeId: "",
      classSectionId: "",
      dateOfBirth: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openAddParent = () => {
    setParentForm({ name: "", email: "", studentDataId: students[0]?.id ?? "", relationship: "", isPrimary: false });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditStudent = (s: any) => {
    setEditId(s.id);
    
    // Find grade based on yearLevel
    const grade = grades.find(g => g.level === s.yearLevel);
    
    setFormData({
      firstName: s.firstName,
      middleName: s.middleName || "",
      lastName: s.lastName,
      email: "",
      role: "ADMIN",
      studentDataId: s.studentDataId || "",
      gender: s.gender || "",
      yearLevel: s.yearLevel || 1,
      gradeId: grade?.id || "",
      classSectionId: s.classSectionId || "",
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditStaff = (s: any) => {
    setEditId(s.id); // organizationMember id

    const parts = (s.user?.name || "").split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");

    setFormData({
      firstName,
      middleName: "",
      lastName,
      email: s.user?.email || "",
      role: s.role,
      studentDataId: "",
      gender: "",
      yearLevel: 1,
      gradeId: "",
      classSectionId: "",
      dateOfBirth: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const res = await deleteStudent(id);
      if (res.error) throw new Error(res.error);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      const res = await deleteStaff(id);
      if (res.error) throw new Error(res.error);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteParentLink = async (linkId: string) => {
    if (!confirm("Remove this parent's link to their child?")) return;
    try {
      const res = await deleteParentLink(linkId);
      if (res.error) throw new Error(res.error);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (activeTab === "students") {
        const selectedGrade = grades.find(g => g.id === formData.gradeId);
        const yearLevel = selectedGrade ? selectedGrade.level : undefined;

        if (editId) {
          const res = await updateStudent(editId, {
            firstName: formData.firstName,
            middleName: formData.middleName || undefined,
            lastName: formData.lastName,
            gender: formData.gender || undefined,
            yearLevel: yearLevel,
            classSectionId: formData.classSectionId || undefined,
            dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          });
          if (res.error) throw new Error(res.error);
        } else {
          const res = await createStudent({
            organizationId,
            firstName: formData.firstName,
            middleName: formData.middleName || undefined,
            lastName: formData.lastName,
            // studentDataId is now entirely omitted so the backend always auto-generates it
            gender: formData.gender || undefined,
            yearLevel: yearLevel,
            classSectionId: formData.classSectionId || undefined,
            dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          });
          if (res.error) throw new Error(res.error);
        }
      } else if (activeTab === "parents") {
        const res = await createParentLink({
          organizationId,
          studentDataId: parentForm.studentDataId,
          name: parentForm.name,
          email: parentForm.email,
          relationship: parentForm.relationship || undefined,
          isPrimary: parentForm.isPrimary,
        });
        if (res.error) throw new Error(res.error);
      } else {
        const forcedRole = ROLE_TABS[activeTab];
        if (editId) {
          const res = await updateStaff(editId, {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            role: (forcedRole as any) ?? formData.role,
          });
          if (res.error) throw new Error(res.error);
        } else {
          const res = await createStaff({
            organizationId,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            role: (forcedRole as any) ?? formData.role,
          });
          if (res.error) throw new Error(res.error);
        }
      }

      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStudentsTable = () => {
    const filtered = students.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      s.studentDataId?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Student ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Gender</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No students found.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">#{s.studentDataId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold uppercase">
                        {s.firstName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-slate-500">Year {s.yearLevel || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{s.gender || 'Not specified'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      s.enrollmentStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.enrollmentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditStudent(s)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  const renderStaffTable = (list: any[]) => {
    const filtered = list.filter((s) =>
      s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No members found.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 uppercase">
                        {s.user?.name?.[0] || '?'}
                      </div>
                      <p className="font-semibold text-slate-800">{s.user?.name || 'Unknown User'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide">
                      {s.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.user?.email}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditStaff(s)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteStaff(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  const renderParentsTable = () => {
    const filtered = parents.filter((p: any) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Child(ren)</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No parents linked yet.</td></tr>
            ) : (
              filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold uppercase">
                        {p.name?.[0] || '?'}
                      </div>
                      <p className="font-semibold text-slate-800">{p.name || 'Unknown'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.email}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {p.children.map((c: any) => (
                        <div key={c.linkId} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-700 font-medium">{c.studentName}</span>
                          {c.relationship && <span className="text-slate-400">({c.relationship})</span>}
                          {c.isPrimary && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-semibold">Primary</span>}
                          <button onClick={() => handleDeleteParentLink(c.linkId)} className="text-slate-300 hover:text-red-600 ml-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">{TAB_LABELS[activeTab]}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={activeTab === "parents" ? openAddParent : openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add {TAB_LABELS[activeTab].replace(/s$/, "")}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {activeTab === "students" && renderStudentsTable()}
        {activeTab === "parents" && renderParentsTable()}
        {namedRoleTabs.includes(activeTab) && renderStaffTable(staffByTab(activeTab))}
        {activeTab === "staff" && renderStaffTable(otherStaff)}
      </div>

      {isModalOpen && activeTab !== "parents" && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editId ? "Edit" : "Add"} {activeTab === "students" ? "Student" : TAB_LABELS[activeTab].replace(/s$/, "")}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Middle Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Middle"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {activeTab === "students" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Class</label>
                      <select
                        value={formData.gradeId}
                        onChange={(e) => {
                          setFormData({ ...formData, gradeId: e.target.value, classSectionId: "" });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Class...</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Class Section</label>
                      <select
                        value={formData.classSectionId}
                        onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
                        disabled={!formData.gradeId}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                      >
                        <option value="">Select Section...</option>
                        {classSections
                          .filter(cs => cs.gradeId === formData.gradeId)
                          .map((cs) => (
                            <option key={cs.id} value={cs.id}>{cs.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="john@example.com"
                    />
                  </div>

                  {activeTab === "staff" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="COUNSELOR">Counselor</option>
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">General Staff</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : (editId ? "Save Changes" : "Add User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && activeTab === "parents" && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Add Parent</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4"
            >
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Parent Name</label>
                <input
                  required
                  type="text"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input
                  required
                  type="email"
                  value={parentForm.email}
                  onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Child</label>
                <select
                  required
                  value={parentForm.studentDataId}
                  onChange={(e) => setParentForm({ ...parentForm, studentDataId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {students.length === 0 && <option value="">No students yet</option>}
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Relationship</label>
                  <input
                    type="text"
                    value={parentForm.relationship}
                    onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Mother, Father, Guardian..."
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={parentForm.isPrimary}
                      onChange={(e) => setParentForm({ ...parentForm, isPrimary: e.target.checked })}
                    />
                    Primary contact
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !parentForm.studentDataId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Add Parent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
