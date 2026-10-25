
import {
  BedDouble,
  CalendarCheck,
  DoorOpen,
  Wallet,
  UserRoundCheck,
  LogOut,
} from "lucide-react";

const statistics = [
  { title: "Total Rooms", icon: BedDouble },
  { title: "Reservations", icon: CalendarCheck },
  { title: "Occupied Rooms", icon: DoorOpen },
  { title: "Revenue", icon: Wallet },
  { title: "Arrivals", icon: UserRoundCheck },
  { title: "Departures", icon: LogOut },
];

function Dashboard() {
  return (
    <div>
      <h1>Dashboard Overview</h1>

      <p className="page-description">
        Welcome to NEXORA Administration.
      </p>

      <div className="stats-grid">
        {statistics.map((item) => {
          const Icon = item.icon;

          return (
            <div className="stat-card" key={item.title}>
              <Icon size={28} />

              <h3>{item.title}</h3>

              <p>Awaiting data</p>
            </div>
          );
        })}
      </div>

      <div className="notice">
        <h2>System Foundation</h2>

        <p>
          Your NEXORA Admin Dashboard is ready.
          Live information will be connected
          in the upcoming development phases.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
