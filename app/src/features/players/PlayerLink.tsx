import { Link } from "react-router-dom";

export default function PlayerLink({ id, username, className }: { id: number; username: string; className?: string }) {
  return (
    <Link data-component="PlayerLink" to={`/players/${id}`} className={className ?? "hover:text-ctp-blue"}>
      {username}
    </Link>
  );
}
