import { Link, useLocation, useNavigate } from "react-router-dom";
import { Folder, LogOut, Users, LayoutDashboard, BookOpen } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("cms_jwt_token");
        localStorage.removeItem("cms_user");
        navigate("/login");
    };

    const [authUser, setAuthUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("cms_user");
        if (storedUser) {
            setAuthUser(JSON.parse(storedUser));
        }
    }, []);

    const userRole = authUser?.Role || authUser?.role || "";

    const navItems = [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Konten List", path: "/konten-list", icon: Folder },
    ];

    if (userRole === "Manajer") {
        navItems.push({ name: "User Management", path: "/users", icon: Users });
    }

    return (
        <aside className="h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 shadow-sm relative z-10 font-sans">
            <div className="h-20 flex items-center px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
                        <BookOpen className="text-white w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">CMS Tim Kreatif</h1>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">Menu Utama</p>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative",
                                isActive
                                    ? "text-indigo-600 bg-indigo-50/50"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
                            )}
                            <item.icon
                                className={clsx("w-5 h-5 transition-colors", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")}
                                strokeWidth={isActive ? 2.2 : 2}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <button onClick={handleLogout} className="flex items-center w-full gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors group">
                    <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" strokeWidth={2} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
