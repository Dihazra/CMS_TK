import DashboardLayout from "@/layouts/dashboard";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Avatar } from "@heroui/avatar";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080/v1");

export default function UsersPage() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const [users, setUsers] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState("");
    const [editStatus, setEditStatus] = useState("");


    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`);
            const data = await res.json();
            if (res.ok) {
                setUsers(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const toggleUserStatus = async (user: any) => {
        const currentStatus = user.status || user.Status;
        const newStatus = currentStatus === "Active" ? "Offline" : "Active";
        const userId = user.id || user.ID;
        const authUser = localStorage.getItem("cms_user");
        const parsed = authUser ? JSON.parse(authUser) : null;
        try {
            await fetch(`${API_BASE}/users/status?id=${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Role": parsed?.Role || parsed?.role || "",
                    "X-User-ID": parsed?.ID || parsed?.id || "",
                },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchUsers();
        } catch (e) {
            console.error(e);
        }
    };


    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async () => {
        if (!name || !email || !role) return;
        setIsLoading(true);
        const authUser = localStorage.getItem("cms_user");
        const parsed = authUser ? JSON.parse(authUser) : null;
        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Role": parsed?.Role || parsed?.role || "",
                    "X-User-ID": parsed?.ID || parsed?.id || "",
                },
                body: JSON.stringify({ name, email, role }),
            });
            if (res.ok) {
                setName("");
                setEmail("");
                setRole("");
                fetchUsers();
                onOpenChange();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menambahkan user");
            }
        } catch (error) {
            console.error("Failed to create user", error);
        }
        setIsLoading(false);
    };

        const openEditModal = (user: any) => {
        setSelectedUser(user);
        setEditName(user.name || user.Name);
        setEditEmail(user.email || user.Email);
        setEditRole(user.role || user.Role);
        setEditStatus(user.status || user.Status);
        onEditOpen();
    };

    const handleEditUser = async () => {
        if (!selectedUser || !editName || !editEmail || !editRole || !editStatus) return;
        setIsLoading(true);
        const authUser = localStorage.getItem("cms_user");
        const parsed = authUser ? JSON.parse(authUser) : null;
        try {
            const userId = selectedUser.id || selectedUser.ID;
            const res = await fetch(`${API_BASE}/users?id=${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Role": parsed?.Role || parsed?.role || "",
                    "X-User-ID": parsed?.ID || parsed?.id || "",
                },
                body: JSON.stringify({ name: editName, email: editEmail, role: editRole, status: editStatus }),
            });
            if (res.ok) {
                fetchUsers();
                onEditOpenChange();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal mengedit user");
            }
        } catch (error) {
            console.error("Failed to edit user", error);
        }
        setIsLoading(false);
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus user ${user.name || user.Name}?`)) return;
        const authUser = localStorage.getItem("cms_user");
        const parsed = authUser ? JSON.parse(authUser) : null;
        try {
            const userId = user.id || user.ID;
            const res = await fetch(`${API_BASE}/users?id=${userId}`, {
                method: "DELETE",
                headers: {
                    "X-User-Role": parsed?.Role || parsed?.role || "",
                    "X-User-ID": parsed?.ID || parsed?.id || "",
                },
            });
            if (res.ok) {
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal menghapus user");
            }
        } catch (error) {
            console.error("Failed to delete user", error);
        }
    };


    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-default-200 pb-4 pt-2 gap-4 sm:gap-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-default-900 tracking-tight">Manajemen User</h1>
                        <p className="text-default-500 mt-1 text-sm sm:text-base">Kelola akses dan peran anggota tim kreatif Anda.</p>
                    </div>
                    <Button onPress={onOpen} color="primary" className="font-medium bg-blue-600 shadow-lg shadow-blue-500/30 font-semibold w-full sm:w-auto" startContent={<Plus className="w-4 h-4" />}>
                        Tambah User
                    </Button>
                </div>

                <Card shadow="sm" radius="lg" className="border border-default-100 bg-white group">
                    <CardBody className="p-0">
                        <div className="overflow-x-auto w-full">
                            <Table aria-label="Daftar User" shadow="none" removeWrapper className="w-full min-w-[600px]">
                            <TableHeader>
                                <TableColumn className="bg-default-50/80 text-default-500 font-semibold uppercase text-[10px] tracking-wider py-4">Pengguna</TableColumn>
                                <TableColumn className="bg-default-50/80 text-default-500 font-semibold uppercase text-[10px] tracking-wider py-4">Peran</TableColumn>
                                <TableColumn className="bg-default-50/80 text-default-500 font-semibold uppercase text-[10px] tracking-wider py-4 text-center">Aksi</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {users.map((item, id) => (
                                    <TableRow key={id} className="hover:bg-default-50 transition-colors border-b border-default-100 last:border-none">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3 w-max">
                                                <Avatar name={item.name || item.Name} className="w-10 h-10 text-sm font-bold shadow-md opacity-90" />
                                                <div>
                                                    <p className="font-bold text-sm text-default-900">{item.name || item.Name}</p>
                                                    <p className="text-xs text-default-500 font-medium">{item.email || item.Email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <p className="font-semibold text-sm text-default-700">{item.role || item.Role}</p>
                                        </TableCell>
                                        <TableCell className="py-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Button onPress={() => toggleUserStatus(item)} variant="flat" size="sm" color={(item.status || item.Status) === 'Active' ? 'warning' : 'success'} className="font-medium min-w-max">
                                                    {(item.status || item.Status) === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                                                </Button>
                                                <Button onPress={() => openEditModal(item)} isIconOnly variant="flat" size="sm" color="primary">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button onPress={() => handleDeleteUser(item)} isIconOnly variant="flat" size="sm" color="danger">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                {/* Modal Undang User */}
                <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                                    <h2 className="text-xl font-bold">Tambah Pengguna Baru</h2>
                                    <p className="text-sm text-default-500 font-normal">Tambahkan email anggota tim Anda ke dalam sistem.</p>
                                </ModalHeader>
                                <ModalBody className="py-6 gap-6">
                                    <div className="flex flex-col gap-4">
                                        <Input
                                            label="Nama Lengkap"
                                            labelPlacement="outside"
                                            placeholder="Masukkan nama lengkap"
                                            variant="bordered"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                        <Input
                                            type="email"
                                            label="Alamat Email"
                                            labelPlacement="outside"
                                            placeholder="email@perusahaan.com"
                                            variant="bordered"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <Select
                                            label="Peran / Role"
                                            labelPlacement="outside"
                                            placeholder="Pilih peran pengguna"
                                            variant="bordered"
                                            selectedKeys={role ? [role] : []}
                                            onChange={(e) => setRole(e.target.value)}
                                        >
                                            <SelectItem key="Manajer" description="Approve, Revisi, dan pantau performa">Manajer</SelectItem>
                                            <SelectItem key="Kreator" description="Mengajukan draft & CRUD Konten">Kreator</SelectItem>
                                        </Select>
                                    </div>
                                </ModalBody>
                                <ModalFooter className="border-t border-default-100 pt-4">
                                    <Button variant="flat" color="danger" onPress={onClose}>
                                        Batal
                                    </Button>
                                    <Button color="primary" onPress={handleCreateUser} isLoading={isLoading} className="bg-blue-600 font-medium">
                                        Tambah Pengguna
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
                
                {/* Modal Edit User */}
                <Modal isOpen={isEditOpen} onOpenChange={onEditOpenChange} size="md">
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1 border-b border-default-100 pb-4">
                                    <h2 className="text-xl font-bold">Edit Pengguna</h2>
                                    <p className="text-sm text-default-500 font-normal">Ubah detail pengguna.</p>
                                </ModalHeader>
                                <ModalBody className="py-6 gap-6">
                                    <div className="flex flex-col gap-4">
                                        <Input
                                            label="Nama Lengkap"
                                            labelPlacement="outside"
                                            placeholder="Masukkan nama lengkap"
                                            variant="bordered"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                        />
                                        <Input
                                            type="email"
                                            label="Alamat Email"
                                            labelPlacement="outside"
                                            placeholder="email@perusahaan.com"
                                            variant="bordered"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                        />
                                        <Select
                                            label="Peran / Role"
                                            labelPlacement="outside"
                                            placeholder="Pilih peran pengguna"
                                            variant="bordered"
                                            selectedKeys={editRole ? [editRole] : []}
                                            onChange={(e) => setEditRole(e.target.value)}
                                        >
                                            <SelectItem key="Manajer" description="Approve, Revisi, dan pantau performa">Manajer</SelectItem>
                                            <SelectItem key="Kreator" description="Mengajukan draft & CRUD Konten">Kreator</SelectItem>
                                        </Select>
                                        <Select
                                            label="Status"
                                            labelPlacement="outside"
                                            placeholder="Pilih status"
                                            variant="bordered"
                                            selectedKeys={editStatus ? [editStatus] : []}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                        >
                                            <SelectItem key="Active">Active</SelectItem>
                                            <SelectItem key="Offline">Offline</SelectItem>
                                        </Select>
                                    </div>
                                </ModalBody>
                                <ModalFooter className="border-t border-default-100 pt-4">
                                    <Button variant="flat" color="danger" onPress={onClose}>
                                        Batal
                                    </Button>
                                    <Button color="primary" onPress={handleEditUser} isLoading={isLoading} className="bg-blue-600 font-medium">
                                        Simpan Perubahan
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
