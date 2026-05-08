import DashboardLayout from "@/layouts/dashboard";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Save, Bell, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 pb-10">
                <div className="flex justify-between items-end border-b border-default-200 pb-4 pt-2">
                    <div>
                        <h1 className="text-3xl font-bold text-default-900 tracking-tight">Pengaturan</h1>
                        <p className="text-default-500 mt-1">Konfigurasi preferensi akun dan sistem CMS Anda.</p>
                    </div>
                    <Button color="primary" className="font-medium bg-blue-600 shadow-lg shadow-blue-500/30 font-semibold" startContent={<Save className="w-4 h-4" />}>
                        Simpan Perubahan
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">
                    <div className="col-span-1 border-r border-default-200 pr-4 flex flex-col gap-2">
                        <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 font-semibold text-sm transition-colors text-left w-full">
                            <Palette className="w-4 h-4" /> Profil Workspace
                        </button>
                        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-default-100 text-default-600 font-medium text-sm transition-colors text-left w-full">
                            <Bell className="w-4 h-4" /> Notifikasi
                        </button>
                        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-default-100 text-default-600 font-medium text-sm transition-colors text-left w-full">
                            <Shield className="w-4 h-4" /> Keamanan
                        </button>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                        <Card shadow="sm" radius="lg" className="border border-default-100 bg-white">
                            <CardBody className="p-8 flex flex-col gap-6">
                                <div>
                                    <h3 className="text-lg font-bold text-default-900">Detail Workspace</h3>
                                    <p className="text-sm text-default-500 mt-1 mb-6">Informasi dasar yang akan ditampilkan ke seluruh tim.</p>

                                    <div className="grid grid-cols-1 gap-6 max-w-xl">
                                        <Input
                                            label="Nama Workspace"
                                            labelPlacement="outside"
                                            placeholder="Masukkan nama tim..."
                                            defaultValue="CMS Tim Kreatif"
                                            variant="bordered"
                                            radius="md"
                                        />
                                        <Input
                                            label="Email Kontak Utama"
                                            labelPlacement="outside"
                                            placeholder="email@perusahaan.com"
                                            defaultValue="admin@cmstim.local"
                                            variant="bordered"
                                            radius="md"
                                        />
                                    </div>
                                </div>

                                <hr className="border-default-100 my-2" />

                                <div>
                                    <h3 className="text-lg font-bold text-default-900">Branding</h3>
                                    <p className="text-sm text-default-500 mt-1 mb-6">Sesuaikan tampilan CMS dengan warna merek Anda.</p>

                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 h-16 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-bold text-2xl">
                                            C
                                        </div>
                                        <Button variant="flat" className="font-medium text-default-700">
                                            Ubah Logo Utama
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
