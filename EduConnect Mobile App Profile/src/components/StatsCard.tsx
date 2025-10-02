import { Card } from "./ui/card";

interface StatsCardProps {
  stats: {
    posts: number;
    groups: number;
    followers: number;
  };
}

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <Card className="bg-white rounded-xl shadow-sm p-4 mx-4 mb-4">
      <div className="flex justify-around items-center">
        {/* Posts */}
        <div className="text-center">
          <div className="text-gray-900 text-xl mb-1">{stats.posts}</div>
          <div className="text-gray-600 text-sm">Posts</div>
        </div>

        {/* Groups Joined */}
        <div className="text-center">
          <div className="text-gray-900 text-xl mb-1">{stats.groups}</div>
          <div className="text-gray-600 text-sm">Groups Joined</div>
        </div>

        {/* Followers */}
        <div className="text-center">
          <div className="text-gray-900 text-xl mb-1">{stats.followers}</div>
          <div className="text-gray-600 text-sm">Followers</div>
        </div>
      </div>
    </Card>
  );
}