export default function MaintenancePage() {
  return (
    <main className="maintenancePage">
      <div className="maintenanceGlow maintenanceGlowOne" />
      <div className="maintenanceGlow maintenanceGlowTwo" />

      <div className="maintenanceCard">
        <div className="maintenanceLogo">
          DROP<span>FITS</span>
        </div>

        <div className="maintenanceBadge">
          MAINTENANCE
        </div>

        <div className="maintenanceIcon">
          <div />
        </div>

        <h1>
          We'll be right back.
        </h1>

        <p>
          DropFits is currently undergoing
          scheduled maintenance.
        </p>

        <span className="maintenanceSmall">
          We're working behind the scenes to
          improve the marketplace.
        </span>

        <div className="maintenanceLine" />

        <span className="maintenanceStatus">
          DROP<span>FITS</span> SYSTEMS
          <b>•</b> TEMPORARILY OFFLINE
        </span>
      </div>
    </main>
  );
}
