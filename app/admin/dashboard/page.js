"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const products = [
  {
    id: "ps5-car-drop",
    name: "PS5 Car Drop",
    price: 14.99,
    tag: "POPULAR"
  },
  {
    id: "modded-account",
    name: "Modded Account",
    price: 39.99,
    tag: "PREMIUM"
  },
  {
    id: "premium-drop",
    name: "Premium Drop",
    price: 24.99,
    tag: "NEW"
  }
];

export default function AdminDashboard() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    paid: 0
  });

  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store"
      });

      if (response.status === 401) {
        router.push("/admin");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setOrders(data.orders || []);

      setStats({
        revenue: data.stats?.revenue || 0,
        orders: data.stats?.orders || 0,
        paid: data.stats?.paid || 0
      });
    } catch {
      console.error("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST"
    });

    router.push("/admin");
  }

  return (
    <main className="dashboardPage">
      <aside className="adminSidebar">
        <div>
          <div className="sidebarLogo">
            DROP<span>FITS</span>
          </div>

          <div className="sidebarBadge">
            ADMIN
          </div>

          <nav className="adminNav">
            <a href="#overview" className="active">
              Overview
            </a>

            <a href="#orders">
              Orders
            </a>

            <a href="#products">
              Products
            </a>
          </nav>
        </div>

        <div className="sidebarBottom">
          <a href="/" target="_blank">
            View Store
          </a>

          <button onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <section className="dashboardContent">
        <header className="dashboardHeader">
          <div>
            <span className="dashboardEyebrow">
              DROP<span>FITS</span> ADMIN
            </span>

            <h1>Dashboard</h1>

            <p>
              Manage your marketplace and monitor your orders.
            </p>
          </div>

          <button
            className="refreshButton"
            onClick={loadOrders}
          >
            Refresh
          </button>
        </header>

        <section id="overview" className="statGrid">
          <div className="dashboardStat">
            <span>Total Revenue</span>
            <strong>
              ${stats.revenue.toFixed(2)}
            </strong>
          </div>

          <div className="dashboardStat">
            <span>Total Orders</span>
            <strong>
              {stats.orders}
            </strong>
          </div>

          <div className="dashboardStat">
            <span>Paid Orders</span>
            <strong>
              {stats.paid}
            </strong>
          </div>

          <div className="dashboardStat">
            <span>Products</span>
            <strong>
              {products.length}
            </strong>
          </div>
        </section>

        <section id="orders" className="dashboardPanel">
          <div className="panelHeader">
            <div>
              <span>RECENT ACTIVITY</span>
              <h2>Orders</h2>
            </div>

            <span className="liveIndicator">
              LIVE
            </span>
          </div>

          {loading ? (
            <div className="emptyState">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="emptyState">
              No orders have been placed yet.
            </div>
          ) : (
            <div className="ordersTable">
              <div className="tableHeader">
                <span>Customer</span>
                <span>Product</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {orders.map((order) => (
                <div
                  className="orderRow"
                  key={order.id}
                >
                  <span>
                    {order.customer || "Unknown"}
                  </span>

                  <span>
                    {order.product || "DropFits Product"}
                  </span>

                  <span>
                    ${Number(order.amount || 0).toFixed(2)}
                  </span>

                  <span>
                    <b
                      className={
                        order.status === "paid"
                          ? "statusPaid"
                          : "statusOther"
                      }
                    >
                      {order.status}
                    </b>
                  </span>

                  <span>
                    {order.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="products" className="dashboardPanel">
          <div className="panelHeader">
            <div>
              <span>STORE INVENTORY</span>
              <h2>Products</h2>
            </div>
          </div>

          <div className="adminProducts">
            {products.map((product) => (
              <div
                className="adminProduct"
                key={product.id}
              >
                <div className="adminProductIcon">
                  DF
                </div>

                <div className="adminProductInfo">
                  <strong>
                    {product.name}
                  </strong>

                  <span>
                    {product.tag}
                  </span>
                </div>

                <strong className="adminProductPrice">
                  ${product.price.toFixed(2)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
