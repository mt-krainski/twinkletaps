"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserProfile } from "@/components/user-profile-provider";
import { getProfileAction, updateProfileAction } from "./actions";

export default function AccountForm() {
  const { profile } = useUserProfile();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [fullname, setFullname] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      const result = await getProfileAction();
      if (cancelled) return;

      if (result.error) {
        setMessage({ text: result.error, type: "error" });
      } else if (result.data) {
        setFullname(result.data.fullName);
        setUsername(result.data.username);
        setWebsite(result.data.website);
        setAvatarUrl(result.data.avatarUrl);
      }

      setLoading(false);
    }

    loadProfile();
    return () => { cancelled = true; };
  }, []);

  function handleUpdateProfile() {
    setMessage(null);

    startTransition(async () => {
      const result = await updateProfileAction({
        fullName: fullname,
        username,
        website,
        avatarUrl,
      });

      if (result.error) {
        setMessage({ text: result.error, type: "error" });
      } else {
        setMessage({ text: "Profile updated successfully!", type: "success" });
      }
    });
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Update your account information and preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={`text-sm p-3 rounded-md ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={profile.email} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullname || ""}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Enter your full name"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username || ""}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={website || ""}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            disabled={loading}
          />
        </div>

        <div className="pt-4">
          <Button
            onClick={handleUpdateProfile}
            disabled={loading || isPending}
            className="w-full"
          >
            {loading || isPending ? "Loading..." : "Update Profile"}
          </Button>
        </div>

        <div className="pt-2">
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
