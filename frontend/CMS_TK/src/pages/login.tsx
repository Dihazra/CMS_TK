import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("cms_jwt_token");
        if (token) {
            navigate("/", { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        
        setIsLoading(true);
        setErrorMsg("");

        try {
            // 1. Coba login ke external API
            const loginRes = await fetch("https://dev-base.appskep.id/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!loginRes.ok) {
                throw new Error("Gagal kredensial. Email atau password salah, silakan coba lagi.");
            }

            // Extract JWT Token
            const tokenData = await loginRes.json();
            // Gunakan fallback "temp-token" jika token eksternal kosong/format tidak ketebak
            const jwtToken = tokenData?.token || tokenData?.data?.token || tokenData?.access_token || "temp-token";

            // 2. Jika sukses login eksternal, validasi apakah user terdaftar (whitelisted) di backend lokal
            const usersRes = await fetch("http://localhost:8080/v1/users");
            if (!usersRes.ok) throw new Error("Gagal mengambil data sistem.");

            const usersList = await usersRes.json();
            const inputEmail = email.trim().toLowerCase();
            const localUser = usersList?.find((u: any) => 
                (u.email || u.Email || "").trim().toLowerCase() === inputEmail
            );

            if (!localUser) {
                const dbEmails = usersList?.map((u: any) => u.Email || u.email).join(", ");
                throw new Error(`Akses ditolak. Email [${inputEmail}] tidak cocok dengan daftar DB: [${dbEmails}]. Pastikan tidak ada salah ketik!`);
            }

            // 3. User valid di eksternal & CMS lokal. Simpan session.
            localStorage.setItem("cms_jwt_token", jwtToken);
            localStorage.setItem("cms_user", JSON.stringify(localUser));

            // Pastikan halaman berpindah dengan me-refresh paksa ke root
            window.location.href = "/"; 
        } catch (error: any) {
            setErrorMsg(error.message || "Terjadi kesalahan saat login.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#f4f4f5] flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="w-full max-w-md px-4 relative z-10">
                <div className="text-center mb-8 animate-fade-in-up">
                    
                    <h1 className="text-4xl font-extrabold text-default-900 tracking-tight mb-2">CMS Tim Kreatif</h1>
                    <p className="text-default-500 font-medium">Masuk untuk mengelola agenda konten Anda.</p>
                </div>

                <Card shadow="lg" className="border border-white/40 bg-white/70 backdrop-blur-xl">
                    <CardHeader className="flex flex-col gap-1 items-start px-8 pt-8 pb-0">
                        <h2 className="text-xl font-bold text-default-900">Selamat Datang Kembali</h2>
                        <p className="text-sm text-default-500">Silakan masukkan detail akun SSO Anda</p>
                    </CardHeader>
                    <CardBody className="px-8 py-8">
                        {errorMsg && (
                            <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg border border-danger-200">
                                {errorMsg}
                            </div>
                        )}
                        <form onSubmit={handleLogin} className="flex flex-col gap-6">
                            <Input
                                autoFocus
                                label="Alamat Email"
                                labelPlacement="outside"
                                placeholder="nama@perusahaan.com"
                                type="email"
                                variant="bordered"
                                radius="lg"
                                size="lg"
                                startContent={<Mail className="text-default-400 w-5 h-5 mr-1" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                classNames={{
                                    inputWrapper: "bg-white/50 border-default-200 hover:border-blue-500 transition-colors"
                                }}
                            />
                            
                            <div>
                                <Input
                                    label="Kata Sandi / SSO"
                                    labelPlacement="outside"
                                    placeholder="Masukkan password Anda"
                                    type="password"
                                    variant="bordered"
                                    radius="lg"
                                    size="lg"
                                    startContent={<Lock className="text-default-400 w-5 h-5 mr-1" />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    classNames={{
                                        inputWrapper: "bg-white/50 border-default-200 hover:border-blue-500 transition-colors"
                                    }}
                                />
                            </div>

                            <Button 
                                type="submit" 
                                color="primary" 
                                size="lg" 
                                radius="lg"
                                isLoading={isLoading}
                                endContent={!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5"
                            >
                                {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <p className="text-center text-sm text-default-400 mt-8">
                    &copy; 2026 CMS Tim Kreatif. All rights reserved.
                </p>
            </div>
        </div>
    );
}
