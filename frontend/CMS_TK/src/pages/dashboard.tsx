import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import DashboardLayout from "@/layouts/dashboard";
import {
    FileText, Clock, AlertCircle, TrendingUp, TrendingDown,
    ChevronLeft, ChevronRight, Loader2, Lock, CalendarCheck
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";

const API_BASE = "http://localhost:8080/v1";

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
    const [plannerLoading, setPlannerLoading] = useState(true);
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
        if (!pillar || pillar === "-") return "bg-transparent text-transparent";
        switch (pillar.toLowerCase()) {
            case "education": return "bg-danger-100 text-danger-700 border border-danger-200";
            case "relatable": return "bg-warning-100 text-warning-800 border border-warning-200";
            case "soal ukom": return "bg-success-100 text-success-700 border border-success-200";
            default: return "bg-blue-100 text-blue-700 border border-blue-200";
        }
    };

    const getPicColor = (pic: string) => {
        if (!pic || pic === "-") return "bg-default-100 text-default-600 border border-default-200";
        const len = pic.length;
        if (len % 3 === 0) return "bg-purple-100 text-purple-700 border border-purple-200";
        if (len % 2 === 0) return "bg-blue-100 text-blue-700 border border-blue-200";
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
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
        setPlannerLoading(true);
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
        } finally {
            setPlannerLoading(false);
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
            <div className="flex flex-col gap-8 pb-10">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-default-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-default-900">Overview</h1>
                        <p className="text-default-500 mt-1">Pantau performa dan tugas kreatif tim Anda hari ini.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card shadow="sm" radius="lg" className="border border-default-100 bg-gradient-to-br from-white to-default-50 overflow-visible relative group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardBody className="px-6 py-5 flex items-start gap-4 flex-row justify-between">
                            <div>
                                <p className="text-default-500 text-sm font-semibold uppercase tracking-wider">Total Konten</p>
                                <div className="flex items-baseline gap-3 mt-2">
                                    <h4 className="text-5xl font-bold text-default-900">{stats.total}</h4>
                                    <span className="flex items-center text-sm font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
                                        <TrendingUp className="w-3 h-3 mr-1" />+12%
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
                                <FileText className="w-8 h-8" strokeWidth={1.5} />
                            </div>
                        </CardBody>
                    </Card>

                    <Card shadow="sm" radius="lg" className="border border-default-100 bg-gradient-to-br from-white to-default-50 overflow-visible relative group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning-400 to-warning-600 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardBody className="px-6 py-5 flex items-start gap-4 flex-row justify-between">
                            <div>
                                <p className="text-default-500 text-sm font-semibold uppercase tracking-wider">Menunggu Review</p>
                                <div className="flex items-baseline gap-3 mt-2">
                                    <h4 className="text-5xl font-bold text-default-900">{stats.review}</h4>
                                    <span className="flex items-center text-sm font-medium text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                                        <TrendingUp className="w-3 h-3 mr-1" />+{stats.review}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-warning-50 text-warning-600 rounded-xl shadow-inner">
                                <Clock className="w-8 h-8" strokeWidth={1.5} />
                            </div>
                        </CardBody>
                    </Card>

                    <Card shadow="sm" radius="lg" className="border border-default-100 bg-gradient-to-br from-white to-default-50 overflow-visible relative group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-danger-400 to-danger-600 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardBody className="px-6 py-5 flex items-start gap-4 flex-row justify-between">
                            <div>
                                <p className="text-default-500 text-sm font-semibold uppercase tracking-wider">Perlu Revisi</p>
                                <div className="flex items-baseline gap-3 mt-2">
                                    <h4 className="text-5xl font-bold text-default-900">{stats.revisi}</h4>
                                    <span className="flex items-center text-sm font-medium text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">
                                        <TrendingDown className="w-3 h-3 mr-1" />-1
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-danger-50 text-danger-600 rounded-xl shadow-inner">
                                <AlertCircle className="w-8 h-8" strokeWidth={1.5} />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Content Planner Calendar */}
                <Card shadow="sm" radius="lg" className="border border-default-100 bg-white overflow-hidden">
                    <div className="px-6 py-5 border-b border-default-100 flex items-center justify-between bg-gradient-to-r from-white to-default-50">
                        <div>
                            <h4 className="text-lg font-bold text-default-900">Jadwal Content Planner</h4>
                            <p className="text-sm font-medium text-default-500 mt-1">Periode: {getDisplayMonth()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {plannerLoading && (
                                <span className="flex items-center gap-1.5 text-xs text-default-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />Memuat...
                                </span>
                            )}
                            {!isManager && (
                                <span className="flex items-center gap-1.5 text-xs text-default-400 bg-default-100 px-3 py-1.5 rounded-lg border border-default-200">
                                    <Lock className="w-3 h-3" />Hanya Manajer yang dapat mengedit
                                </span>
                            )}
                            <div className="flex items-center gap-1 bg-default-100 p-1 rounded-lg border border-default-200">
                                <Button size="sm" isIconOnly variant="flat" onPress={() => setWeekOffset(w => w - 4)}>
                                    <ChevronLeft className="w-4 h-4 text-default-600" />
                                </Button>
                                <span className="text-xs font-semibold px-2 text-default-600">Geser Bulan</span>
                                <Button size="sm" isIconOnly variant="flat" onPress={() => setWeekOffset(w => w + 4)}>
                                    <ChevronRight className="w-4 h-4 text-default-600" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <CardBody className="p-0 overflow-x-auto bg-default-50/30">
                        <div className="min-w-[800px]">
                            {/* Header */}
                            <div className="grid grid-cols-8 border-b-2 border-default-300 bg-default-100/50">
                                <div className="p-2 text-center text-xs font-bold text-default-600 uppercase border-r border-default-200 flex items-center justify-center">Keterangan</div>
                                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day, i) => (
                                    <div key={day} className={`p-2 text-center text-xs font-bold text-default-700 border-default-200 ${i !== 6 ? "border-r" : ""}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* 4 Weeks */}
                            {[0, 1, 2, 3].map((weekNumber) => {
                                const daysInWeek = Array.from({ length: 7 }).map((_, i) => {
                                    const dateObj = new Date();
                                    const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
                                    dateObj.setDate(dateObj.getDate() - dayOfWeek + 1 + (weekNumber + weekOffset) * 7 + i);
                                    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
                                    const dataItem = plannerDict[dateKey];
                                    return { dateKey, dateString: dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long" }), dataItem };
                                });

                                return (
                                    <div key={weekNumber} className="border-b-4 border-default-200 last:border-b-0 hover:bg-white transition-colors">
                                        {/* Tanggal */}
                                        <div className="grid grid-cols-8 border-b border-default-200">
                                            <div className="p-1 px-2 text-xs font-semibold text-default-600 border-r border-default-200 flex items-center">Tanggal</div>
                                            {daysInWeek.map((day, i) => (
                                                <div key={i} className={`p-1 px-2 text-xs font-medium text-center text-default-800 ${i !== 6 ? "border-r" : ""} border-default-200`}>
                                                    {day.dateString}
                                                </div>
                                            ))}
                                        </div>

                                        {/* PIC */}
                                        <div className="grid grid-cols-8 border-b border-default-100">
                                            <div className="p-2 px-3 text-[11px] font-bold text-default-500 border-r border-default-200 flex items-center uppercase tracking-wider bg-white">PIC</div>
                                            {daysInWeek.map((day, i) => {
                                                const locked = isPlanLocked(day.dataItem);
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => handlePlannerClick(day.dateKey, day.dateString, day.dataItem)}
                                                        className={`p-1.5 ${i !== 6 ? "border-r" : ""} border-default-200 relative group transition-colors
                                                            ${isManager ? "cursor-pointer hover:bg-default-100" : "cursor-default"}`}
                                                    >
                                                        <div className={`text-[10px] font-bold px-2 py-1 rounded w-full text-center truncate shadow-sm transition-all ${getPicColor(day.dataItem?.pic || "-")}`}>
                                                            {day.dataItem?.pic || "-"}
                                                        </div>
                                                        {locked && <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-default-400" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pilar Konten */}
                                        <div className="grid grid-cols-8 border-b border-default-100">
                                            <div className="p-2 px-3 text-[11px] font-bold text-default-500 border-r border-default-200 flex items-center uppercase tracking-wider bg-white">Pilar Konten</div>
                                            {daysInWeek.map((day, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handlePlannerClick(day.dateKey, day.dateString, day.dataItem)}
                                                    className={`p-1.5 ${i !== 6 ? "border-r" : ""} border-default-200 relative group transition-colors
                                                        ${isManager ? "cursor-pointer hover:bg-default-100" : "cursor-default"}`}
                                                >
                                                    <div className={`text-[10px] font-bold px-2 py-1 rounded w-full text-center truncate shadow-sm transition-all ${getPillarColor(day.dataItem?.pillar || "-")}`}>
                                                        {day.dataItem?.pillar || "-"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Status Plan */}
                                        <div className="grid grid-cols-8">
                                            <div className="p-2 px-3 text-[11px] font-bold text-default-500 border-r border-default-200 flex items-center uppercase tracking-wider bg-white">Status</div>
                                            {daysInWeek.map((day, i) => {
                                                const chip = day.dataItem ? getPlanStatusChip(day.dataItem.status) : null;
                                                return (
                                                    <div key={i} className={`p-1.5 ${i !== 6 ? "border-r" : ""} border-default-200 flex flex-col items-center justify-center gap-1`}>
                                                        {chip ? (
                                                            <>
                                                                <Chip size="sm" variant="flat" color={chip.color} className="text-[9px] font-bold h-5 px-1.5 min-h-[20px]">
                                                                    {chip.label}
                                                                </Chip>
                                                                {isManager && day.dataItem?.content_id && (
                                                                    <a 
                                                                        href={`/konten-list?content_id=${day.dataItem.content_id}`} 
                                                                        className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 mt-0.5 transition-colors font-medium cursor-pointer"
                                                                    >
                                                                        <FileText className="w-2.5 h-2.5" /> Lihat Konten
                                                                    </a>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-default-300">-</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
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
                                    <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <CalendarCheck className="w-5 h-5 text-blue-600" />
                                            <h2 className="text-xl font-bold">Edit Agenda Planner</h2>
                                        </div>
                                        <p className="text-sm text-default-500 font-normal">Tanggal: {selectedDateDisplay}</p>
                                    </ModalHeader>
                                    <ModalBody className="py-6 gap-5">
                                        <Input
                                            label="PIC (Penanggung Jawab)"
                                            labelPlacement="outside"
                                            placeholder="Misal: Rahmat"
                                            variant="bordered"
                                            value={editPic}
                                            onChange={(e) => setEditPic(e.target.value)}
                                        />
                                        <Select
                                            label="Pilar Konten"
                                            labelPlacement="outside"
                                            placeholder="Pilih pilar"
                                            variant="bordered"
                                            selectedKeys={editPillar && editPillar !== "-" ? [editPillar] : []}
                                            onChange={(e) => setEditPillar(e.target.value)}
                                        >
                                            <SelectItem key="Education" textValue="Education">Education</SelectItem>
                                            <SelectItem key="Relatable" textValue="Relatable">Relatable</SelectItem>
                                            <SelectItem key="Soal UKOM" textValue="Soal UKOM">Soal UKOM</SelectItem>
                                            <SelectItem key="PIC" textValue="PIC">PIC</SelectItem>
                                        </Select>
                                    </ModalBody>
                                    <ModalFooter className="border-t border-default-100 pt-4">
                                        <Button
                                            variant="flat"
                                            color="danger"
                                            onPress={() => { setEditPic(""); setEditPillar(""); setEditContentId(""); }}
                                            isDisabled={saving}
                                        >
                                            Kosongkan
                                        </Button>
                                        <Button
                                            color="primary"
                                            onPress={handleSavePlanner}
                                            isLoading={saving}
                                            className="bg-blue-600 font-medium px-6"
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
