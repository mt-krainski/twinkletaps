import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>
          Structured layout coming soon. Use the sidebar to explore your
          workspaces.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Primary dashboard content placeholder.</span>
      </CardContent>
    </Card>
  );
}
