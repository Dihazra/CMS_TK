import { Sidebar } from "@/components/sidebar";
import { User, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userName, setUserName] = useState("User");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
            timeoutTimer = setTimeout(logout, 25 * 60 * 1000); // 15 menit
        };

        const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        
        resetTimer(); // Initialize timer

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(timeoutTimer);
        };
    }, []);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex h-screen w-full bg-[#f4f4f5] overflow-hidden font-sans relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden w-full">
                <header className="h-16 md:h-24 bg-white md:bg-transparent flex items-center justify-between px-4 md:px-10 border-b md:border-none border-default-200">
                    <div className="flex items-center gap-3">
                        <Button isIconOnly variant="light" className="md:hidden" onPress={() => setIsSidebarOpen(true)}>
                            <Menu className="w-6 h-6 text-default-700" />
                        </Button>
                        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground md:hidden">CMS</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100/50">
                            <User className="text-blue-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-default-800 text-sm font-semibold hidden sm:block">{userName}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 md:px-10 pb-8 pt-6 md:pt-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
