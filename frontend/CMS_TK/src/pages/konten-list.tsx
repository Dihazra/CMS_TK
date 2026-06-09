import DashboardLayout from "@/layouts/dashboard";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Plus, FileText, Lock, CalendarDays, Send, Calendar, Search } from "lucide-react";
import { Avatar } from "@heroui/avatar";
import { useState, useEffect } from "react";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";

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

function statusChip(status: string) {
    switch (status) {
        case "Review":   return { color: "warning" as const, label: "Menunggu Review" };
        case "Revision": return { color: "danger" as const,  label: "Perlu Revisi" };
        case "Approved": return { color: "success" as const, label: "Approved" };
        default:         return { color: "default" as const, label: "Draft" };
    }
}

interface PlanOption {
    id: string;
    pic: string;
    pillar: string;
    plan_date: string; // "YYYY-MM-DD"
    status: string;
}

export default function KontenListPage() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isReviewOpen, onOpen: onReviewOpen, onOpenChange: onReviewOpenChange } = useDisclosure();

    // ─── Submit modal (pilih plan) ────────────────────────────────────────────
    const {
        isOpen: isSubmitOpen,
        onOpen: onSubmitOpen,
        onOpenChange: onSubmitOpenChange,
    } = useDisclosure();

    const [selectedContent, setSelectedContent] = useState<any>(null);
    const [authUser, setAuthUser] = useState<any>(null);

    useEffect(() => {
        setAuthUser(getAuthUser());
    }, []);

    const userRole = authUser?.Role || authUser?.role || "";
    const isManager = userRole === "Manajer";

    const [feedback, setFeedback] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [isReviewing, setIsReviewing] = useState(false);

    // ─── Available plans for submit ───────────────────────────────────────────
    const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
    const [selectedPlanDate, setSelectedPlanDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const templateHTML = `
        <h3>📌 SLIDE 1</h3>
        <p><strong>Judul/Topik:</strong> [Masukkan Judul Slide]</p>
        <p>Insert pict &rarr; <code>[Nama File Gambar]</code></p>
        <br/>
        <h3>📌 SLIDE 2</h3>
        <p><em>(Anda bisa paste tabel dari Excel/Word/Google Docs langsung ke sini)</em></p>
        <br/>
        <p><strong>Keyword:</strong> </p>
        <p><strong>Referensi Desain:</strong> </p>
        <hr/>
        <h3>📌 CTA (Call to Action)</h3>
        <p><em>[Klik Link di Bio!]</em></p>
    `;

    const [editorContent, setEditorContent] = useState(templateHTML);
    const [contents, setContents] = useState<any[]>([]);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [authorId, setAuthorId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // ─── Search & Pagination ────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const filteredContents = contents.filter(item => {
        const query = searchQuery.toLowerCase();
        return (item.title && item.title.toLowerCase().includes(query)) || 
               (item.category && item.category.toLowerCase().includes(query)) ||
               (item.author_name && item.author_name.toLowerCase().includes(query));
    });

    const totalPages = Math.ceil(filteredContents.length / ITEMS_PER_PAGE) || 1;
    const paginatedContents = filteredContents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // ─── fetch contents ───────────────────────────────────────────────────────
    const fetchData = async () => {
        const user = getAuthUser();
        try {
            const res = await fetch(`${API_BASE}/contents`, { headers: authHeaders(user) });
            if (res.ok) setContents((await res.json()) || []);
        } catch (err) {
            console.error("Failed to fetch contents", err);
        }
    };

    // ─── fetch available plans (Kreator) ──────────────────────────────────────
    const fetchAvailablePlans = async (currentContentId?: string) => {
        const user = getAuthUser();
        try {
            const res = await fetch(`${API_BASE}/plans`, {
                headers: authHeaders(user),
            });
            if (res.ok) {
                const allPlans = (await res.json()) || [];
                const available = allPlans.filter((p: any) => 
                    (!p.content_id && p.status === "Planned") ||
                    (currentContentId && p.content_id === currentContentId)
                );
                setAvailablePlans(available);
            }
        } catch (err) {
            console.error("Failed to fetch available plans", err);
        }
    };

    useEffect(() => {
        fetchData();
        if (!isManager) fetchAvailablePlans();
    }, [isManager]);

    // Check URL params for auto-open (dari link di Dashboard Planner)
    useEffect(() => {
        if (contents.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const cid = params.get("content_id");
            if (cid) {
                const item = contents.find(c => c.id === cid || c.ID === cid);
                if (item) {
                    handleOpenReview(item);
                }
                // Hapus query param setelah dibuka agar tidak berulang
                const url = new URL(window.location.href);
                url.searchParams.delete("content_id");
                window.history.replaceState({}, "", url.toString());
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contents]);

    // ─── modal: buat konten ───────────────────────────────────────────────────
    const handleOpenModal = () => {
        setSelectedContent(null);
        setTitle("");
        setCategory("");
        setAuthorId(authUser?.ID || authUser?.id || "");
        setEditorContent(templateHTML);
        onOpen();
    };

    const handleEditModal = (item: any) => {
        setSelectedContent(item);
        setTitle(item.title);
        setCategory(item.category);
        setEditorContent(item.content);
        setAuthorId(item.author_id);
        onOpen();
    };

    const handleCreateContent = async () => {
        if (!title || !category || !authorId || !editorContent) return;
        setIsLoading(true);
        const user = getAuthUser();
        try {
            const contentId = selectedContent?.id || selectedContent?.ID;
            const url = selectedContent
                ? `${API_BASE}/contents/edit?id=${contentId}`
                : `${API_BASE}/contents`;
            const method = selectedContent ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: authHeaders(user),
                body: JSON.stringify({ title, category, content: editorContent, author_id: authorId }),
            });
            if (res.ok) {
                setTitle(""); setCategory(""); setEditorContent(""); setAuthorId("");
                fetchData();
                onOpenChange();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menyimpan konten");
            }
        } catch (err) {
            console.error("Failed to save content", err);
        }
        setIsLoading(false);
    };

    // ─── delete content ───────────────────────────────────────────────────────
    const handleDeleteContent = async (id: string) => {
        if (!confirm("Yakin ingin menghapus draf konten ini?")) return;
        const user = getAuthUser();
        try {
            const res = await fetch(`${API_BASE}/contents?id=${id}`, {
                method: "DELETE",
                headers: authHeaders(user),
            });
            if (res.ok) {
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menghapus konten");
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    // ─── buka modal pilih plan sebelum submit ─────────────────────────────────
    const handleOpenSubmitModal = async (item: any) => {
        setSelectedContent(item);
        setSelectedPlanDate(item.plan_date || "");
        await fetchAvailablePlans(item.id || item.ID);
        onSubmitOpen();
    };

    // ─── submit konten ke review (setelah pilih plan) ─────────────────────────
    const handleSubmitToReview = async () => {
        if (!selectedContent || !selectedPlanDate) {
            alert("Pilih jadwal plan terlebih dahulu.");
            return;
        }
        setIsSubmitting(true);
        const user = getAuthUser();
        try {
            const id = selectedContent.id || selectedContent.ID;
            const res = await fetch(`${API_BASE}/contents/submit?id=${id}`, {
                method: "PUT",
                headers: authHeaders(user),
                body: JSON.stringify({ plan_date: selectedPlanDate }),
            });
            if (res.ok) {
                await fetchData();
                await fetchAvailablePlans();
                onSubmitOpenChange();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal mengajukan review");
            }
        } catch (err) {
            console.error("Failed to submit to review:", err);
        }
        setIsSubmitting(false);
    };

    // ─── review konten (Manajer) ──────────────────────────────────────────────
    const handleOpenReview = (item: any) => {
        setSelectedContent(item);
        setFeedback(item.feedback || "");
        setNewStatus(item.status === "Review" ? "" : item.status);
        onReviewOpen();
    };

    const handleReviewContent = async () => {
        if (!selectedContent) return;
        if (!newStatus) { alert("Pilih status review terlebih dahulu."); return; }
        if (newStatus === "Revision" && !feedback.trim()) {
            alert("Feedback wajib diisi ketika memberikan status Revision.");
            return;
        }
        setIsReviewing(true);
        const user = getAuthUser();
        try {
            const res = await fetch(
                `${API_BASE}/contents/review?id=${selectedContent.id || selectedContent.ID}`,
                {
                    method: "PUT",
                    headers: authHeaders(user),
                    body: JSON.stringify({ status: newStatus, feedback }),
                }
            );
            if (res.ok) {
                fetchData();
                onReviewOpenChange();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menyimpan review");
            }
        } catch (err) {
            console.error("Failed to review content", err);
        }
        setIsReviewing(false);
    };

    const isContentLocked = (item: any) => item.status === "Approved";

    // ─── render ───────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 pb-10 font-sans">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-100 pb-4 pt-2 gap-4 sm:gap-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Daftar Konten</h1>
                        <p className="text-slate-500 mt-1 text-sm">Kelola dan pantau seluruh konten materi Anda dengan mudah.</p>
                    </div>
                    {!isManager && (
                        <Button
                            onPress={handleOpenModal}
                            color="primary"
                            className="font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto"
                            startContent={<Plus className="w-4 h-4" />}
                        >
                            Buat Konten Baru
                        </Button>
                    )}
                </div>

                {/* Tools & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 gap-4 sm:gap-0">
                    <Input
                        classNames={{
                            base: "w-full sm:max-w-xs",
                            inputWrapper: "bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors shadow-none",
                        }}
                        placeholder="Cari judul, pilar atau kreator..."
                        startContent={<Search className="text-slate-400 w-4 h-4" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Menampilkan {paginatedContents.length} dari {filteredContents.length} konten
                    </div>
                </div>

                {/* Tabel */}
                <Card shadow="sm" className="border border-slate-200/80 bg-white">
                    <CardBody className="p-0">
                        <div className="overflow-x-auto w-full">
                            <Table aria-label="Daftar Konten" shadow="none" removeWrapper className="w-full min-w-[800px]">
                                <TableHeader>
                                    <TableColumn className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Judul Konten</TableColumn>
                                    <TableColumn className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Penyusun</TableColumn>
                                    <TableColumn className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Jadwal</TableColumn>
                                    <TableColumn className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Status</TableColumn>
                                    <TableColumn className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4 text-center">Aksi</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {paginatedContents.map((item, idx) => {
                                        const chip = statusChip(item.status);
                                        const locked = isContentLocked(item);
                                        return (
                                            <TableRow key={item.id || idx} className="hover:bg-slate-50/40 transition-colors border-b border-slate-100 last:border-none">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                            locked 
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                                : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                        }`}>
                                                            {locked ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-800">{item.title}</p>
                                                            <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar name={item.author_name} className="w-6 h-6 text-[10px] font-bold" />
                                                        <p className="text-slate-700 font-semibold text-sm">{item.author_name}</p>
                                                    </div>
                                                </TableCell>
                                                {/* Kolom Jadwal */}
                                                <TableCell className="py-4">
                                                    {item.plan_date ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                            <span className="text-sm font-semibold text-slate-700">
                                                                {new Date(item.plan_date + "T00:00:00").toLocaleDateString("id-ID", {
                                                                    day: "numeric", month: "short", year: "numeric"
                                                                })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300 italic font-medium">Belum dijadwalkan</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Chip size="sm" variant="flat" color={chip.color} className="font-bold text-xs">
                                                        {chip.label}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    {isManager ? (
                                                        <div className="flex justify-center gap-1.5">
                                                            <Button onPress={() => handleOpenReview(item)} variant="light" size="sm" className="font-bold text-indigo-600 hover:text-indigo-850 hover:bg-indigo-50/50">
                                                                Detail & Review
                                                            </Button>
                                                            <Button onPress={() => handleEditModal(item)} variant="light" size="sm" className="font-bold text-amber-600 hover:text-amber-800 hover:bg-amber-50/50">
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1.5">
                                                            <Button onPress={() => handleOpenReview(item)} variant="light" size="sm" className="font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50">
                                                                Detail
                                                            </Button>
                                                            {(item.status === "Draft" || item.status === "Revision") && (
                                                                <>
                                                                    {/* Kirim Review */}
                                                                    <Button
                                                                        onPress={() => handleOpenSubmitModal(item)}
                                                                        variant="flat" size="sm"
                                                                        className="font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100/50"
                                                                        startContent={<Send className="w-3 h-3" />}
                                                                    >
                                                                        Kirim Review
                                                                    </Button>
                                                                    <Button onPress={() => handleEditModal(item)} variant="light" size="sm" className="font-bold text-amber-600 hover:text-amber-800 hover:bg-amber-50/50">
                                                                        Edit
                                                                    </Button>
                                                                    <Button onPress={() => handleDeleteContent(item.id || item.ID)} variant="light" size="sm" className="font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50/50">
                                                                        Hapus
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardBody>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-100 bg-slate-50/40 gap-4">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    isDisabled={currentPage === 1}
                                    onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="font-semibold"
                                >
                                    Sebelumnya
                                </Button>
                                <Button 
                                    size="sm" 
                                    isDisabled={currentPage === totalPages}
                                    onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="font-bold bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white shadow-sm"
                                >
                                    Selanjutnya
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Modal Buat / Edit Konten */}
                <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                                    <h2 className="text-lg font-bold text-slate-800">{selectedContent ? "Edit Konten" : "Buat Konten Baru"}</h2>
                                    <p className="text-xs text-slate-500 font-normal">Buat atau edit draf konten materi Anda di sini.</p>
                                </ModalHeader>
                                <ModalBody className="py-6 px-6 gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="col-span-1 sm:col-span-2">
                                            <Input 
                                                label="Judul Konten" 
                                                labelPlacement="outside" 
                                                placeholder="Masukkan judul konten..." 
                                                variant="bordered" 
                                                value={title} 
                                                onChange={(e) => setTitle(e.target.value)} 
                                                classNames={{
                                                    inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors"
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input 
                                                label="Profil Pembuat" 
                                                labelPlacement="outside" 
                                                variant="bordered" 
                                                isReadOnly 
                                                value={authUser?.Name || authUser?.name || "Kreator Akun Ini"} 
                                                startContent={<Avatar name={authUser?.Name || authUser?.name} className="w-5 h-5 text-[9px] font-bold" />} 
                                                classNames={{
                                                    inputWrapper: "bg-slate-100/70 border-slate-200 cursor-not-allowed"
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Select 
                                                label="Pilar Konten" 
                                                labelPlacement="outside" 
                                                placeholder="Pilih pilar" 
                                                variant="bordered" 
                                                selectedKeys={category ? [category] : []} 
                                                onChange={(e) => setCategory(e.target.value)}
                                                classNames={{
                                                    trigger: "bg-slate-50 border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors"
                                                }}
                                            >
                                                <SelectItem key="Education" textValue="Education">Education</SelectItem>
                                                <SelectItem key="Relatable" textValue="Relatable">Relatable</SelectItem>
                                                <SelectItem key="Soal UKOM" textValue="Soal UKOM">Soal UKOM</SelectItem>
                                                <SelectItem key="PIC" textValue="PIC">PIC</SelectItem>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700">Isi Konten</label>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white [&_.se-toolbar]:border-none [&_.se-toolbar]:border-b [&_.se-toolbar]:border-slate-100 [&_.se-resizing-bar]:hidden">
                                            <SunEditor
                                                setContents={editorContent}
                                                onChange={setEditorContent}
                                                placeholder="Tuliskan isi konten Anda di sini..."
                                                setOptions={{
                                                    buttonList: [
                                                        ['undo', 'redo'],
                                                        ['formatBlock', 'font', 'fontSize'],
                                                        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                                                        ['fontColor', 'hiliteColor'],
                                                        ['align', 'list', 'lineHeight'],
                                                        ['outdent', 'indent'],
                                                        ['table', 'horizontalRule', 'link', 'image', 'video'],
                                                        ['fullScreen', 'showBlocks', 'codeView']
                                                    ],
                                                    minHeight: '250px'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </ModalBody>
                                <ModalFooter className="border-t border-slate-100 pt-4">
                                    <Button variant="flat" color="danger" onPress={onClose} className="font-medium">Batal</Button>
                                    <Button onPress={handleCreateContent} isLoading={isLoading} className="bg-indigo-650 hover:bg-indigo-750 bg-indigo-600 text-white font-semibold px-6 shadow-sm">
                                        Simpan Draf
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>

                {/* Modal Pilih Jadwal Plan Sebelum Submit */}
                <Modal isOpen={isSubmitOpen} onOpenChange={onSubmitOpenChange} size="md">
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5 text-indigo-600" />
                                        <h2 className="text-lg font-bold text-slate-800">Pilih Jadwal Plan</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 font-normal">
                                        Tentukan tanggal jadwal mana yang akan diisi oleh konten ini.
                                    </p>
                                </ModalHeader>
                                <ModalBody className="py-6 gap-5">
                                    {/* Info konten yang akan dikirim */}
                                    <Card shadow="none" className="border border-slate-200 bg-slate-50/50">
                                        <CardBody className="p-4">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Konten yang dikirim</p>
                                            <p className="font-bold text-slate-800 text-sm">{selectedContent?.title}</p>
                                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedContent?.category}</p>
                                        </CardBody>
                                    </Card>

                                    {availablePlans.length === 0 ? (
                                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                                            <CalendarDays className="w-10 h-10 text-slate-350" />
                                            <p className="text-slate-500 text-xs font-semibold">
                                                Tidak ada jadwal plan yang tersedia.
                                            </p>
                                            <p className="text-slate-400 text-[11px]">
                                                Minta Manajer untuk menambahkan jadwal di Content Planner terlebih dahulu.
                                            </p>
                                        </div>
                                    ) : (
                                        <Select
                                            label="Pilih Tanggal Plan"
                                            labelPlacement="outside"
                                            placeholder="Pilih jadwal yang tersedia..."
                                            variant="bordered"
                                            selectedKeys={selectedPlanDate ? [selectedPlanDate] : []}
                                            onChange={(e) => setSelectedPlanDate(e.target.value)}
                                            description="Hanya jadwal yang belum berisi konten yang ditampilkan"
                                            classNames={{
                                                trigger: "bg-slate-50 border-slate-200 hover:border-slate-300 focus-within:!border-indigo-500 transition-colors"
                                            }}
                                        >
                                            {availablePlans.map((plan) => (
                                                <SelectItem key={plan.plan_date} textValue={plan.plan_date}>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm text-slate-850">
                                                            {new Date(plan.plan_date + "T00:00:00").toLocaleDateString("id-ID", {
                                                                weekday: "long", day: "numeric", month: "long", year: "numeric"
                                                            })}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-semibold">
                                                            PIC: {plan.pic} · Pilar: {plan.pillar}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    )}
                                </ModalBody>
                                <ModalFooter className="border-t border-slate-100 pt-4">
                                    <Button variant="flat" color="default" onPress={onClose} isDisabled={isSubmitting} className="font-semibold">Batal</Button>
                                    <Button
                                        onPress={handleSubmitToReview}
                                        isLoading={isSubmitting}
                                        isDisabled={!selectedPlanDate || availablePlans.length === 0}
                                        className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                        startContent={!isSubmitting && <Send className="w-4 h-4" />}
                                    >
                                        Kirim ke Review
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>

                {/* Modal Detail / Review Konten */}
                <Modal isOpen={isReviewOpen} onOpenChange={onReviewOpenChange} size="4xl" scrollBehavior="inside">
                    <ModalContent>
                        {(onClose) => {
                            const chip = statusChip(selectedContent?.status);
                            return (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                                        <div className="flex justify-between items-center w-full">
                                            <h2 className="text-lg font-bold text-slate-800">{isManager ? "Review Konten" : "Detail Konten"}</h2>
                                            <Chip size="sm" variant="flat" color={chip.color} className="font-bold">{chip.label}</Chip>
                                        </div>
                                        <p className="text-xs text-slate-500 font-normal">
                                            {isManager ? "Tinjau, berikan revisi, atau setujui konten." : "Lihat isi konten Anda beserta feedback dari Manajer."}
                                        </p>
                                    </ModalHeader>
                                    <ModalBody className="py-6 px-4 md:px-6 gap-6 bg-slate-50/40">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className={(isManager || selectedContent?.feedback) ? "col-span-1 lg:col-span-2 flex flex-col gap-4" : "col-span-1 lg:col-span-3 flex flex-col gap-4"}>
                                                <Card shadow="none" className="border border-slate-200 bg-white">
                                                    <CardBody className="p-6">
                                                        <h3 className="text-lg font-bold text-slate-800 mb-2">{selectedContent?.title}</h3>
                                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-semibold text-slate-400 mb-6 border-b border-slate-100 pb-4">
                                                            <span>Oleh: <strong className="text-slate-650">{selectedContent?.author_name}</strong></span>
                                                            <span>Pilar: <strong className="text-slate-650">{selectedContent?.category}</strong></span>
                                                            {selectedContent?.plan_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                                                    Jadwal:&nbsp;
                                                                    <strong className="text-slate-650">
                                                                        {new Date(selectedContent.plan_date + "T00:00:00").toLocaleDateString("id-ID", {
                                                                            weekday: "long", day: "numeric", month: "long", year: "numeric"
                                                                        })}
                                                                    </strong>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="sun-editor-editable text-sm w-full overflow-x-auto text-slate-700" style={{ padding: 0, backgroundColor: 'transparent', border: 'none' }} dangerouslySetInnerHTML={{ __html: selectedContent?.content || "" }} />
                                                    </CardBody>
                                                </Card>
                                            </div>

                                            {(isManager || selectedContent?.feedback) && (
                                                <div className="col-span-1 flex flex-col gap-4">
                                                    {isManager && (
                                                        <Card shadow="none" className="border border-amber-200 bg-amber-50/20">
                                                            <CardBody className="p-4 gap-4">
                                                                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">Panel Manajer</h4>
                                                                <Select
                                                                    label="Keputusan Review"
                                                                    labelPlacement="outside"
                                                                    variant="bordered"
                                                                    placeholder="Pilih keputusan..."
                                                                    selectedKeys={newStatus ? [newStatus] : []}
                                                                    onChange={(e) => setNewStatus(e.target.value)}
                                                                    classNames={{
                                                                        trigger: "bg-white border-amber-200/60 focus-within:!border-amber-500 transition-colors"
                                                                    }}
                                                                >
                                                                    <SelectItem key="Revision" textValue="Butuh Revisi">Butuh Revisi</SelectItem>
                                                                    <SelectItem key="Approved" textValue="Approved / Disetujui">Approved / Disetujui</SelectItem>
                                                                </Select>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                                                        Feedback
                                                                        {newStatus === "Revision" && <span className="text-rose-500 ml-1">*wajib</span>}
                                                                    </label>
                                                                    <textarea
                                                                        className="w-full text-sm p-3 border border-amber-200/60 rounded-lg bg-white min-h-[140px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                        placeholder="Tuliskan catatan revisi atau komentar..."
                                                                        value={feedback}
                                                                        onChange={(e) => setFeedback(e.target.value)}
                                                                    />
                                                                </div>
                                                            </CardBody>
                                                        </Card>
                                                    )}

                                                    {selectedContent?.feedback && (
                                                        <Card shadow="none" className="border border-rose-200 bg-rose-50/20">
                                                            <CardBody className="p-4">
                                                                <h4 className="font-bold text-xs text-rose-800 mb-1.5 uppercase tracking-wider">
                                                                    {isManager ? "Histori Feedback" : "Feedback dari Manajer"}
                                                                </h4>
                                                                <p className="text-sm text-rose-700 italic font-medium">"{selectedContent?.feedback}"</p>
                                                            </CardBody>
                                                        </Card>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </ModalBody>
                                    <ModalFooter className="border-t border-slate-100 pt-4">
                                        <Button variant="flat" color="default" onPress={onClose} className="font-semibold">Tutup</Button>
                                        {isManager && selectedContent?.status === "Review" && (
                                            <Button
                                                onPress={handleReviewContent}
                                                isLoading={isReviewing}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-sm"
                                            >
                                                Simpan Review
                                            </Button>
                                        )}
                                    </ModalFooter>
                                </>
                            );
                        }}
                    </ModalContent>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
