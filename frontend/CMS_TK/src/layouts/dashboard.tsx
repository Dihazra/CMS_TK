import { Sidebar } from "@/components/sidebar";
import { User } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userName, setUserName] = useState("User");

    useEffect(() => {
        const userStr = localStorage.getItem("cms_user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserName(user.Name || user.name || user.Email || user.email || "User");
            } catch (e) {
                console.error("Gagal parsing data user", e);
            }
        }

        // Auto logout if idle for 15 minutes
        let timeoutTimer: ReturnType<typeof setTimeout>;
        
        const logout = () => {
            localStorage.removeItem("cms_user");
            localStorage.removeItem("cms_jwt_token");
            localStorage.removeItem("cms_last_active");
            window.location.href = "/login";
        };

        const resetTimer = () => {
            localStorage.setItem("cms_last_active", Date.now().toString());
            clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(logout, 15 * 60 * 1000); // 15 menit
        };

        const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        
        resetTimer(); // Initialize timer

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(timeoutTimer);
        };
    }, []);

    return (
        <div className="flex h-screen w-full bg-[#f4f4f5] overflow-hidden font-sans">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <header className="h-24 bg-transparent flex items-center justify-between px-10">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground"></h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100/50">
                            <User className="text-blue-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-default-800 text-sm font-semibold">{userName}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-10 pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
