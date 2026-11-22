export default function AnnouncementBar({ settings = {} }) {
  return <div className="announcement">{settings.announcement || 'Delivery across Pakistan. Pay with cash on delivery.'}</div>;
}
