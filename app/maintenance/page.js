export default function ShutdownPage() {
return (
  <div className="maintenanceCard">
    <div className="maintenanceBadge">
      SERVICE SHUTDOWN
    </div>
    <div className="maintenanceIcon">
      <div />
    </div>
    <h1>
      We're shutting down.
    </h1>
    <p>
      This service is no longer available.
      We have made the decision to shut down
      due to a lack of resources required to
      continue operating.
    </p>
    <span className="maintenanceSmall">
      We appreciate everyone who supported us,
      used our services, and was part of the
      community while we were online.
    </span>
    <div className="maintenanceLine" />
    <span className="maintenanceStatus">
      SERVICE
      <b>•</b>
      PERMANENTLY SHUT DOWN
    </span>
  </div>
</main>

);
}