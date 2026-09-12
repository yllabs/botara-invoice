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

const defaultSettings = {
  maintenance: false,
  payments: {
    "ps5-car-drop": true,
    "modded-account": true,
    "premium-drop": true
  }
};

export default function AdminDashboard() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    paid: 0
  });

  const [settings, setSettings] = useState(
    defaultSettings
  );

  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] =
    useState(true);
  const [saving, setSaving] = useState("");

  async function loadOrders() {
    try {
      const response = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store"
        }
      );

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
        revenue: Number(data.stats?.revenue || 0),
        orders: Number(data.stats?.orders || 0),
        paid: Number(data.stats?.paid || 0)
      });
    } catch {
      console.error(
        "Failed to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch(
        "/api/admin/settings",
        {
          cache: "no-store"
        }
      );

      if (response.status === 401) {
        router.push("/admin");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setSettings({
        maintenance: Boolean(
          data.maintenance
        ),
        payments: {
          "ps5-car-drop":
            data.payments?.[
              "ps5-car-drop"
            ] !== false,

          "modded-account":
            data.payments?.[
              "modded-account"
            ] !== false,

          "premium-drop":
            data.payments?.[
              "premium-drop"
            ] !== false
        }
      });
    } catch {
      console.error(
        "Failed to load store settings."
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, []);

  async function updateSettings(
    updates,
    savingKey
  ) {
    setSaving(savingKey);

    try {
      const response = await fetch(
        "/api/admin/settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updates)
        }
      );

      if (response.status === 401) {
        router.push("/admin");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Unable to update settings."
        );
        return;
      }

      setSettings({
        maintenance: Boolean(
          data.maintenance
        ),
        payments: {
          "ps5-car-drop":
            data.payments?.[
              "ps5-car-drop"
            ] !== false,

          "modded-account":
            data.payments?.[
              "modded-account"
            ] !== false,

          "premium-drop":
            data.payments?.[
              "premium-drop"
            ] !== false
        }
      });
    } catch {
      alert(
        "Unable to update settings."
      );
    } finally {
      setSaving("");
    }
  }

  function toggleMaintenance() {
    updateSettings(
      {
        maintenance:
          !settings.maintenance
      },
      "maintenance"
    );
  }

  function toggleProduct(productId) {
    updateSettings(
      {
        payments: {
          [productId]:
            !settings.payments[
              productId
            ]
        }
      },
      productId
    );
  }

  async function refreshDashboard() {
    setLoading(true);
    setSettingsLoading(true);

    await Promise.all([
      loadOrders(),
      loadSettings()
    ]);
  }

  async function logout() {
    await fetch(
      "/api/admin/logout",
      {
        method: "POST"
      }
    );

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
            <a
              href="#overview"
              className="active"
            >
              Overview
            </a>

            <a href="#orders">
              Orders
            </a>

            <a href="#products">
              Products
            </a>

            <a href="#controls">
              Site Controls
            </a>
          </nav>
        </div>

        <div className="sidebarBottom">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
          >
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
              Manage your marketplace and
              monitor your orders.
            </p>
          </div>

          <button
            className="refreshButton"
            onClick={refreshDashboard}
          >
            Refresh
          </button>
        </header>

        <section
          id="overview"
          className="statGrid"
        >
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

        <section
          id="controls"
          className="dashboardPanel"
        >
          <div className="panelHeader">
            <div>
              <span>
                STORE CONTROL
              </span>

              <h2>
                Site Controls
              </h2>
            </div>

            <span
              className={
                settings.maintenance
                  ? "statusOther"
                  : "statusPaid"
              }
            >
              {settings.maintenance
                ? "MAINTENANCE"
                : "ONLINE"}
            </span>
          </div>

          {settingsLoading ? (
            <div className="emptyState">
              Loading controls...
            </div>
          ) : (
            <div className="controlList">
              <div className="controlRow">
                <div>
                  <strong>
                    Site Maintenance
                  </strong>

                  <span>
                    Take the public
                    marketplace offline
                    while staff performs
                    maintenance.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    settings.maintenance
                      ? "controlToggle enabled"
                      : "controlToggle"
                  }
                  disabled={
                    saving ===
                    "maintenance"
                  }
                  onClick={
                    toggleMaintenance
                  }
                >
                  {saving ===
                  "maintenance"
                    ? "Saving..."
                    : settings.maintenance
                    ? "ON"
                    : "OFF"}
                </button>
              </div>

              <div className="controlDivider" />

              <div className="controlSectionTitle">
                <span>
                  PAYMENT CONTROLS
                </span>

                <p>
                  Disable individual
                  products without
                  taking the entire
                  store offline.
                </p>
              </div>

              {products.map(
                (product) => {
                  const enabled =
                    settings
                      .payments[
                      product.id
                    ];

                  return (
                    <div
                      className="controlRow"
                      key={product.id}
                    >
                      <div>
                        <strong>
                          {product.name}
                        </strong>

                        <span>
                          {enabled
                            ? "Customers can purchase this product."
                            : "Purchases are currently disabled."}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={
                          enabled
                            ? "controlToggle enabled"
                            : "controlToggle"
                        }
                        disabled={
                          saving ===
                          product.id
                        }
                        onClick={() =>
                          toggleProduct(
                            product.id
                          )
                        }
                      >
                        {saving ===
                        product.id
                          ? "Saving..."
                          : enabled
                          ? "ON"
                          : "OFF"}
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section
          id="orders"
          className="dashboardPanel"
        >
          <div className="panelHeader">
            <div>
              <span>
                RECENT ACTIVITY
              </span>

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
              No orders have been
              placed yet.
            </div>
          ) : (
            <div className="ordersTable">
              <div className="tableHeader">
                <span>
                  Customer
                </span>

                <span>
                  Product
                </span>

                <span>
                  Amount
                </span>

                <span>
                  Status
                </span>

                <span>
                  Date
                </span>
              </div>

              {orders.map(
                (order) => (
                  <div
                    className="orderRow"
                    key={order.id}
                  >
                    <span>
                      {order.customer ||
                        "Unknown"}
                    </span>

                    <span>
                      {order.product ||
                        "DropFits Product"}
                    </span>

                    <span>
                      $
                      {Number(
                        order.amount ||
                          0
                      ).toFixed(2)}
                    </span>

                    <span>
                      <b
                        className={
                          order.status ===
                          "paid"
                            ? "statusPaid"
                            : "statusOther"
                        }
                      >
                        {
                          order.status
                        }
                      </b>
                    </span>

                    <span>
                      {order.date}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section
          id="products"
          className="dashboardPanel"
        >
          <div className="panelHeader">
            <div>
              <span>
                STORE INVENTORY
              </span>

              <h2>
                Products
              </h2>
            </div>
          </div>

          <div className="adminProducts">
            {products.map(
              (product) => {
                const enabled =
                  settings
                    .payments[
                    product.id
                  ];

                return (
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
                        {enabled
                          ? "PAYMENTS ENABLED"
                          : "PAYMENTS DISABLED"}
                      </span>
                    </div>

                    <strong className="adminProductPrice">
                      $
                      {product.price.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
