import { Card } from "./ui/card";
import { Users, Bookmark, HelpCircle, Bell, Settings, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  {
    icon: Users,
    label: "My Groups",
    isDestructive: false
  },
  {
    icon: Bookmark,
    label: "Saved Posts",
    isDestructive: false
  },
  {
    icon: HelpCircle,
    label: "Q&A Contributions",
    isDestructive: false
  },
  {
    icon: Bell,
    label: "Notifications",
    isDestructive: false
  },
  {
    icon: Settings,
    label: "Account Settings",
    isDestructive: false
  },
  {
    icon: LogOut,
    label: "Logout",
    isDestructive: true
  }
];

export function ProfileOptions() {
  return (
    <Card className="bg-white rounded-xl shadow-sm mx-4">
      {menuItems.map((item, index) => {
        const IconComponent = item.icon;
        
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <IconComponent 
                  className={`w-5 h-5 ${item.isDestructive ? 'text-red-600' : 'text-gray-600'}`} 
                />
                <span className={`${item.isDestructive ? 'text-red-600' : 'text-gray-900'}`}>
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            {index < menuItems.length - 1 && (
              <div className="h-px bg-gray-100 mx-4"></div>
            )}
          </div>
        );
      })}
    </Card>
  );
}