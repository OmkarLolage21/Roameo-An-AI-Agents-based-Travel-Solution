"use client"

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Globe, Heart, Settings } from "lucide-react"

export default function UserProfileView() {
  return (
    <Card className="p-6">
      <Tabs defaultValue="preferences">
        <TabsList className="mb-6">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Travel Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <Globe className="h-5 w-5 mb-2" />
                  <h4 className="font-semibold mb-1">Preferred Destinations</h4>
                  <p className="text-sm text-muted-foreground">Europe, Asia</p>
                </Card>
                <Card className="p-4">
                  <Heart className="h-5 w-5 mb-2" />
                  <h4 className="font-semibold mb-1">Travel Interests</h4>
                  <p className="text-sm text-muted-foreground">Culture, Food, Nature</p>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Travel Style</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Accommodation</Label>
                    <Input defaultValue="Boutique Hotels" />
                  </div>
                  <div>
                    <Label>Budget Range</Label>
                    <Input defaultValue="$100-200 per day" />
                  </div>
                </div>
                <Button>Update Preferences</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payment Methods</h3>
              <Button>
                <CreditCard className="h-4 w-4 mr-2" />
                Add New Card
              </Button>
            </div>

            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <CreditCard className="h-6 w-6" />
                    <div>
                      <p className="font-semibold">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input defaultValue="user@example.com" />
                </div>
                <div>
                  <Label>Language</Label>
                  <Input defaultValue="English" />
                </div>
                <div>
                  <Label>Time Zone</Label>
                  <Input defaultValue="UTC-5 (Eastern Time)" />
                </div>
                <Button>Save Changes</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Push Notifications</Label>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}