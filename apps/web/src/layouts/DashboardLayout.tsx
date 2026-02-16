import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--primary-color)', margin: 0 }}>TestTrack Pro</h1>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <NavLink
                                to="/test-cases"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                Test Cases
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/test-runs"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                Test Runs
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/templates"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                Templates
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/test-suites"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                Test Suites
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="w-full secondary">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
