import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import DashboardLayout from "@/layouts/dashboard";
import {
    FileText, Clock, AlertCircle, TrendingUp, TrendingDown,
    ChevronLeft, ChevronRight, Lock, CalendarCheck
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080/v1");

function getAuthUser() {
    const stored = localStorage.getItem("cms_user");
    return stored ? JSON.parse(stored) : null;
}

function authHeaders(user: any): Record<string, string> {
    return {
        "Content-Type": "application/json",
        "X-User-Role": user?.Role || user?.role || "",
        "X-User-ID": user?.ID || user?.id || "",
    };
}

interface PlanData {
    id?: string;
    pic: string;
    pillar: string;
    content_id?: string;
    plan_date: string;
    status: string; // Planned | In Progress | Completed
}

interface ContentOption {
    id: string;
    title: string;
    category: string;
    status: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState({ total: 0, review: 0, revisi: 0 });
    const [plannerDict, setPlannerDict] = useState<Record<string, PlanData>>({});
    // Removed unused plannerLoading state
    const [saving, setSaving] = useState(false);
    const [availableContents, setAvailableContents] = useState<ContentOption[]>([]);

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [weekOffset, setWeekOffset] = useState(0);

    const [selectedDateKey, setSelectedDateKey] = useState("");
    const [selectedDateDisplay, setSelectedDateDisplay] = useState("");
    const [editPic, setEditPic] = useState("");
    const [editPillar, setEditPillar] = useState("");
    const [editContentId, setEditContentId] = useState("");
    const [editStatus, setEditStatus] = useState("Planned");

    const authUser = getAuthUser();
    const userRole = authUser?.Role || authUser?.role || "";
    const isManager = userRole === "Manajer";

    // ─── color helpers ────────────────────────────────────────────────────────
    const getPillarColor = (pillar: string) => {
        if (!pillar || pillar === "-") return "bg-transparent text-transparent border-transparent";
        switch (pillar.toLowerCase()) {
            case "education": return "bg-rose-50 text-rose-700 border border-rose-100";
            case "relatable": return "bg-amber-50 text-amber-800 border border-amber-100";
            case "soal ukom": return "bg-emerald-50 text-emerald-700 border border-emerald-100";
            default: return "bg-indigo-50 text-indigo-700 border border-indigo-100";
        }
    };

    const getPicColor = (pic: string) => {
        if (!pic || pic === "-") return "bg-slate-50 text-slate-500 border border-slate-200/60";
        const len = pic.length;
        if (len % 3 === 0) return "bg-violet-50 text-violet-700 border border-violet-100";
        if (len % 2 === 0) return "bg-sky-50 text-sky-700 border border-sky-100";
        return "bg-teal-50 text-teal-700 border border-teal-100";
    };

    const getPlanStatusChip = (status: string) => {
        switch (status) {
            case "Review":   return { color: "warning" as const, label: "Review" };
            case "Completed": return { color: "success" as const, label: "Completed" };
            default:         return { color: "default" as const, label: "Planned" };
        }
    };

    const getDisplayMonth = () => {
        const d = new Date();
        d.setDate(d.getDate() + weekOffset * 7);
        return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    };

    // ─── check if plan is locked (content Approved) ───────────────────────────
    const isPlanLocked = (plan?: PlanData) => {
        if (!plan?.content_id) return false;
        const linkedContent = availableContents.find(c => c.id === plan.content_id);
        // If content is not in availableContents (non-Approved filter), check via status on plan
        // We check against the content list fetched from API
        return linkedContent === undefined && !!plan.content_id;
        // content removed from "available" when Approved → plan is locked
    };

    // ─── fetch data ───────────────────────────────────────────────────────────
    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/plans`, {
                headers: {
                    "X-User-Role": userRole,
                    "X-User-ID": authUser?.ID || authUser?.id || "",
                },
            });
            if (res.ok) {
                const data: PlanData[] = (await res.json()) || [];
                const dict: Record<string, PlanData> = {};
                data.forEach((p) => {
                    dict[p.plan_date] = p;
                });
                setPlannerDict(dict);
            }
        } catch (err) {
            console.error("Failed to fetch plans:", err);
        }
    }, []);

    const fetchContents = useCallback(async () => {
        try {
            // Fetch all contents to show in dropdown (only non-Approved available for new plan)
            const res = await fetch(`${API_BASE}/contents`, {
                headers: {
                    "X-User-Role": "Manajer", // Manajer sees non-Draft
                    "X-User-ID": authUser?.ID || authUser?.id || "",
                },
            });
            if (res.ok) {
                const data = (await res.json()) || [];
                // Available for assignment: non-Approved contents
                setAvailableContents(
                    data
                        .filter((c: any) => c.status !== "Approved")
                        .map((c: any) => ({ id: c.id, title: c.title, category: c.category, status: c.status }))
                );
            }
        } catch (err) {
            console.error("Failed to fetch contents:", err);
        }
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch(`${API_BASE}/contents`, {
                    headers: authHeaders(authUser),
                });
                if (res.ok) {
                    const data = (await res.json()) || [];
                    const total = data.length;
                    const review = data.filter((d: any) => d.status === "Review").length;
                    const revisi = data.filter((d: any) => d.status === "Revision").length;
                    setStats({ total, review, revisi });
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };
        fetchDashboardData();
        fetchPlans();
        if (isManager) fetchContents();
    }, [fetchPlans, fetchContents, isManager]);

    // ─── open modal ───────────────────────────────────────────────────────────
    const handlePlannerClick = (dateKey: string, dateDisplay: string, dataItem?: PlanData) => {
        if (!isManager) return; // Kreator hanya bisa lihat
        setSelectedDateKey(dateKey);
        setSelectedDateDisplay(dateDisplay);
        setEditPic(dataItem?.pic && dataItem.pic !== "-" ? dataItem.pic : "");
        setEditPillar(dataItem?.pillar && dataItem.pillar !== "-" ? dataItem.pillar : "");
        setEditContentId(dataItem?.content_id || "");
        setEditStatus(dataItem?.status || "Planned");
        onOpen();
    };

    // ─── save plan (Manajer only) ─────────────────────────────────────────────
    const handleSavePlanner = async () => {
        if (!selectedDateKey) return;
        setSaving(true);
        try {
            if (!editPic && !editPillar) {
                // Delete plan
                const res = await fetch(`${API_BASE}/plans?date=${selectedDateKey}`, {
                    method: "DELETE",
                    headers: authHeaders(authUser),
                });
                if (res.ok) {
                    const newDict = { ...plannerDict };
                    delete newDict[selectedDateKey];
                    setPlannerDict(newDict);
                } else {
                    const err = await res.json();
                    alert(err.error || "Gagal menghapus plan");
                }
            } else {
                // Upsert
                const res = await fetch(`${API_BASE}/plans`, {
                    method: "PUT",
                    headers: authHeaders(authUser),
                    body: JSON.stringify({
                        pic: editPic || "-",
                        pillar: editPillar || "-",
                        plan_date: selectedDateKey,
                        content_id: editContentId || undefined,
                        status: editStatus,
                    }),
                });
                if (res.ok) {
                    const saved: PlanData = await res.json();
                    setPlannerDict(prev => ({ ...prev, [selectedDateKey]: saved }));
                } else {
                    const err = await res.json();
                    alert(err.error || "Gagal menyimpan plan");
                }
            }
        } catch (err) {
            console.error("Failed to save plan:", err);
        } finally {
            setSaving(false);
            onOpenChange();
        }
    };

    // ─── render ───────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 pb-10 font-sans">
                {/* Header */}
                <div className="pb-4 border-b border-slate-100">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Ringkasan</h1>
                    <p className="text-slate-500 mt-1 text-sm">Pantau performa dan tugas kreatif tim Anda hari ini.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card shadow="sm" className="border border-slate-200/80 bg-white">
                        <CardBody className="p-6 flex items-center justify-between flex-row">
                            <div className="space-y-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Konten</p>
                                <div className="flex items-baseline gap-2.5">
                                    <h4 className="text-4xl font-extrabold text-slate-800">{stats.total}</h4>
                                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" />+12%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                                <FileText className="w-6 h-6" strokeWidth={2} />
                            </div>
                        </CardBody>
                    </Card>

                    <Card shadow="sm" className="border border-slate-200/80 bg-white">
                        <CardBody className="p-6 flex items-center justify-between flex-row">
                            <div className="space-y-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Menunggu Review</p>
                                <div className="flex items-baseline gap-2.5">
                                    <h4 className="text-4xl font-extrabold text-slate-800">{stats.review}</h4>
                                    {stats.review > 0 && (
                                        <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                            <TrendingUp className="w-3.5 h-3.5 mr-1" />+{stats.review}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50 shadow-sm">
                                <Clock className="w-6 h-6" strokeWidth={2} />
                            </div>
                        </CardBody>
                    </Card>

                    <Card shadow="sm" className="border border-slate-200/80 bg-white">
                        <CardBody className="p-6 flex items-center justify-between flex-row">
                            <div className="space-y-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Perlu Revisi</p>
                                <div className="flex items-baseline gap-2.5">
                                    <h4 className="text-4xl font-extrabold text-slate-800">{stats.revisi}</h4>
                                    <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                        <TrendingDown className="w-3.5 h-3.5 mr-1" />-1
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/50 shadow-sm">
                                <AlertCircle className="w-6 h-6" strokeWidth={2} />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Content Planner Calendar */}
                <Card shadow="sm" className="border border-slate-200/80 bg-white overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-base font-bold text-slate-800">Jadwal Content Planner</h4>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Periode: {getDisplayMonth()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                            <Button size="sm" isIconOnly variant="light" className="text-slate-600 h-8 w-8 min-w-8" onPress={() => setWeekOffset(w => w - 4)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-[11px] font-bold px-2 text-slate-500 uppercase tracking-wider">Geser Bulan</span>
                            <Button size="sm" isIconOnly variant="light" className="text-slate-600 h-8 w-8 min-w-8" onPress={() => setWeekOffset(w => w + 4)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <CardBody className="p-0 overflow-x-auto bg-slate-50/20"> 
                        <div className="min-w-[900px]">
                            {/* Days of Week Header */}
                            <div className="grid grid-cols-7 border-b border-slate-500 bg-slate-950">
                                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day, i) => (
                                    <div key={day} className={`p-3 text-center text-xs font-bold text-white border-slate-500 ${i !== 6 ? "border-r" : ""}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* 4 Weeks Grid */}
                            {[0, 1, 2, 3].map((weekNumber) => {
                                const daysInWeek = Array.from({ length: 7 }).map((_, i) => {
                                    const dateObj = new Date();
                                    const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
                                    dateObj.setDate(dateObj.getDate() - dayOfWeek + 1 + (weekNumber + weekOffset) * 7 + i);
                                    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
                                    const dataItem = plannerDict[dateKey];
                                    return { dateKey, dateObj, dateString: dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long" }), dataItem };
                                });

                                return (
                                    <div key={weekNumber} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                                        {daysInWeek.map((day, i) => {
                                            const locked = isPlanLocked(day.dataItem);
                                            const chip = day.dataItem ? getPlanStatusChip(day.dataItem.status) : null;
                                            const isToday = new Date().toDateString() === day.dateObj.toDateString();
                                            
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => handlePlannerClick(day.dateKey, day.dateString, day.dataItem)}
                                                    className={`min-h-[135px] p-3 border-r last:border-r-0 border-slate-100 bg-white transition-all flex flex-col justify-between group relative
                                                        ${isManager ? "cursor-pointer hover:bg-slate-50/80" : "cursor-default"}
                                                        ${isToday ? "bg-indigo-50/20 ring-1 ring-inset ring-indigo-500/20" : ""}`}
                                                >
                                                    {/* Date Header */}
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            isToday 
                                                                ? "bg-indigo-600 text-white shadow-sm" 
                                                                : "text-slate-600 bg-slate-100"
                                                        }`}>
                                                            {day.dateObj.getDate()} {day.dateObj.toLocaleDateString("id-ID", { month: "short" })}
                                                        </span>
                                                        {locked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                                                    </div>

                                                    {/* Day Details */}
                                                    {day.dataItem ? (
                                                        <div className="flex flex-col gap-1.5 flex-1 justify-end py-1">
                                                            {/* PIC */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">PIC:</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-full ${getPicColor(day.dataItem.pic)}`}>
                                                                    {day.dataItem.pic}
                                                                </span>
                                                            </div>

                                                            {/* Pilar */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Pilar:</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-full ${getPillarColor(day.dataItem.pillar)}`}>
                                                                    {day.dataItem.pillar}
                                                                </span>
                                                            </div>

                                                            {/* Status */}
                                                            {chip && (
                                                                <div className="mt-1 flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5">
                                                                    <Chip size="sm" variant="flat" color={chip.color} className="text-[9px] font-bold h-5 px-1.5 min-h-[20px]">
                                                                        {chip.label}
                                                                    </Chip>
                                                                    {isManager && day.dataItem.content_id && (
                                                                        <a 
                                                                            href={`/konten-list?content_id=${day.dataItem.content_id}`} 
                                                                            className="text-[9px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors font-semibold"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <FileText className="w-3 h-3" /> Detail
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center justify-center py-2">
                                                            <span className="text-[10px] text-slate-300 italic group-hover:text-slate-400 transition-colors font-medium">Kosong</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>

                {/* Modal Edit Plan (Manajer only) */}
                {isManager && (
                    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                        <ModalContent>
                            {() => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <CalendarCheck className="w-5 h-5 text-indigo-600" />
                                            <h2 className="text-lg font-bold text-slate-800">Edit Agenda Planner</h2>
                                        </div>
                                        <p className="text-xs text-slate-500 font-normal">Tanggal: {selectedDateDisplay}</p>
                                    </ModalHeader>
                                    <ModalBody className="py-6 gap-5">
                                        <Input
                                            label="PIC (Penanggung Jawab)"
                                            labelPlacement="outside"
                                            placeholder="Misal: Rahmat"
                                            variant="bordered"
                                            value={editPic}
                                            onChange={(e) => setEditPic(e.target.value)}
                                            classNames={{
                                                inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors"
                                            }}
                                        />
                                        <Select
                                            label="Pilar Konten"
                                            labelPlacement="outside"
                                            placeholder="Pilih pilar"
                                            variant="bordered"
                                            selectedKeys={editPillar && editPillar !== "-" ? [editPillar] : []}
                                            onChange={(e) => setEditPillar(e.target.value)}
                                            classNames={{
                                                trigger: "bg-slate-50 border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors"
                                            }}
                                        >
                                            <SelectItem key="Education" textValue="Education">Education</SelectItem>
                                            <SelectItem key="Relatable" textValue="Relatable">Relatable</SelectItem>
                                            <SelectItem key="Soal UKOM" textValue="Soal UKOM">Soal UKOM</SelectItem>
                                            <SelectItem key="PIC" textValue="PIC">PIC</SelectItem>
                                        </Select>
                                    </ModalBody>
                                    <ModalFooter className="border-t border-slate-100 pt-4">
                                        <Button
                                            variant="flat"
                                            color="danger"
                                            onPress={() => { setEditPic(""); setEditPillar(""); setEditContentId(""); }}
                                            isDisabled={saving}
                                            className="font-medium"
                                        >
                                            Kosongkan
                                        </Button>
                                        <Button
                                            color="primary"
                                            onPress={handleSavePlanner}
                                            isLoading={saving}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-sm"
                                        >
                                            Simpan Perubahan
                                        </Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>
                )}
            </div>
        </DashboardLayout>
    );
}
