import { Link, useLocation, useNavigate } from "react-router-dom";
import { Folder, LogOut, Users, LayoutDashboard } from "lucide-react";
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
        <aside className="h-screen w-64 bg-white border-r border-default-200 flex flex-col flex-shrink-0 shadow-sm relative z-10">
            <div className="h-24 flex items-center px-8">
                <div className="flex items-center gap-3 mt-7">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="text-white font-bold text-lg leading-none">📖</span>
                    </div>
                    <h1 className="text-xl font-bold text-default-900 tracking-tight">CMS Tim Kreatif</h1>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <p className="px-4 text-xs font-semibold text-default-400 uppercase tracking-wider mb-4 mt-2">Main Menu</p>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "text-blue-700 bg-blue-50/80 shadow-sm"
                                    : "text-default-600 hover:bg-default-100 hover:text-default-900",
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                            )}
                            <item.icon
                                className={clsx("w-5 h-5 transition-colors", isActive ? "text-blue-600" : "text-default-400 group-hover:text-default-600")}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-5 border-t border-default-100">
                <button onClick={handleLogout} className="flex items-center w-full gap-4 px-4 py-3 rounded-xl text-default-600 hover:bg-danger-50 hover:text-danger-600 transition-colors group">
                    <LogOut className="w-5 h-5 text-default-400 group-hover:text-danger-500" strokeWidth={2} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
