"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Users, User, Calendar } from "lucide-react";
import TripGallery from "@/components/TripGallery";
import TripsView from "@/components/TripsView";
import CohortsView from "@/components/CohortsView";
import UserProfileView from "@/components/UserProfileView";
import TravelPlanner from "@/components/travel-planner";
import TravelSearch from "@/components/travelSearch";
import ExpensesView from "@/components/ExpensesView";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("trips");
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/auth/verify-token", { withCredentials: true });

        if (!response.data.success) {
          router.push("/login");
        } else {
          setLoading(false);
        }
      } catch (error) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeView) {
      case "trips":
        return <TripsView />;
      case "cohorts":
        return <CohortsView />;
      case "profile":
        return <UserProfileView />;
      case "itinerary":
        return <TravelPlanner />;
      case "AIitinerary":
        return <TravelSearch />;
      case "expenses":
        return <ExpensesView />;
      default:
        return <TripsView />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <TripGallery />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="h-5 w-5" />
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No new notifications</p>
              </div>
            </Card>
            <Card className="p-4">
              <nav className="space-y-2">
                <Button
                  variant={activeView === "trips" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("trips")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Trips
                </Button>
                <Button
                  variant={activeView === "cohorts" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("cohorts")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Cohorts
                </Button>
                <Button
                  variant={activeView === "expenses" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("expenses")}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Expenses
                </Button>
                <Button
                  variant={activeView === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("profile")}
                >
                  <User className="h-4 w-4 mr-2" />
                  User Profile
                </Button>
                <Button
                  variant={activeView === "itinerary" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("itinerary")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Itinerary Generation
                </Button>
                <Button
                  variant={activeView === "AIitinerary" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("AIitinerary")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Explore Hyper-personalized booking
                </Button>
              </nav>
            </Card>
          </div>
          <div className="col-span-9">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
}