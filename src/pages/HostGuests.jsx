import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, Plus, Download, Filter, Users, AlertTriangle, Crown, Ban
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function HostGuests() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [repeatFilter, setRepeatFilter] = useState(false);
  const [sortBy, setSortBy] = useState("last_stay");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: () => base44.entities.Guest.filter({ deleted: false }),
  });

  // Filter and sort guests
  const filteredGuests = guests
    .filter(guest => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        guest.full_name?.toLowerCase().includes(searchLower) ||
        guest.email?.toLowerCase().includes(searchLower) ||
        guest.phone?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || guest.status === statusFilter;

      // Risk filter
      const matchesRisk = riskFilter === "all" || guest.risk_level === riskFilter;

      // Repeat guest filter
      const matchesRepeat = !repeatFilter || guest.total_stays >= 2;

      return matchesSearch && matchesStatus && matchesRisk && matchesRepeat;
    })
    .sort((a, b) => {
      if (sortBy === "last_stay") {
        return new Date(b.last_stay_date || 0) - new Date(a.last_stay_date || 0);
      } else if (sortBy === "spend") {
        return b.lifetime_spend - a.lifetime_spend;
      } else if (sortBy === "stays") {
        return b.total_stays - a.total_stays;
      }
      return 0;
    });

  const exportCSV = () => {
    const headers = ["Full Name", "Email", "Phone", "Stays", "Total Spend", "Last Stay", "Status", "Risk Level"];
    const rows = filteredGuests.map(g => [
      g.full_name,
      g.email,
      g.phone || "",
      g.total_stays,
      g.lifetime_spend,
      g.last_stay_date ? format(parseISO(g.last_stay_date), "yyyy-MM-dd") : "",
      g.status,
      g.risk_level
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const statusColors = {
    standard: "bg-gray-100 text-gray-700",
    vip: "bg-purple-100 text-purple-700",
    blacklisted: "bg-red-100 text-red-700"
  };

  const riskColors = {
    none: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    high_risk: "bg-red-100 text-red-700"
  };

  const statusIcons = {
    standard: null,
    vip: <Crown className="w-3 h-3" />,
    blacklisted: <Ban className="w-3 h-3" />
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Guest Management</h1>
            <p className="text-gray-500">{filteredGuests.length} guests</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Link to={createPageUrl('GuestProfile') + "?new=true"}>
              <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Plus className="w-4 h-4" />
                Add Guest
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Filter className="w-4 h-4 mr-2" />
                  Status: {statusFilter === "all" ? "All" : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("standard")}>Standard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("vip")}>VIP</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("blacklisted")}>Blacklisted</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Filter className="w-4 h-4 mr-2" />
                  Risk: {riskFilter === "all" ? "All" : riskFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRiskFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter("none")}>None</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter("warning")}>Warning</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter("high_risk")}>High Risk</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant={repeatFilter ? "default" : "outline"}
              onClick={() => setRepeatFilter(!repeatFilter)}
            >
              Repeat Guests
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start">
                  Sort: {sortBy === "last_stay" ? "Last Stay" : sortBy === "spend" ? "Spend" : "Stays"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("last_stay")}>Last Stay Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("spend")}>Total Spend</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("stays")}>Number of Stays</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Guests Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Stays</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead>Last Stay</TableHead>
                <TableHead className="text-center">Upcoming</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No guests found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests.map((guest) => (
                  <TableRow key={guest.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Link to={createPageUrl('GuestProfile') + `?id=${guest.id}`} className="font-medium text-gray-900 hover:text-teal-600">
                        {guest.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-600">{guest.email}</TableCell>
                    <TableCell className="text-gray-600">{guest.phone || "-"}</TableCell>
                    <TableCell className="text-center font-medium">{guest.total_stays}</TableCell>
                    <TableCell className="text-right font-semibold">£{guest.lifetime_spend.toFixed(2)}</TableCell>
                    <TableCell className="text-gray-600">
                      {guest.last_stay_date ? format(parseISO(guest.last_stay_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {guest.has_upcoming_stay ? (
                        <Badge className="bg-blue-100 text-blue-700">Yes</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[guest.status]} flex items-center gap-1 w-fit`}>
                        {statusIcons[guest.status]}
                        {guest.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={riskColors[guest.risk_level]}>
                        {guest.risk_level === "high_risk" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {guest.risk_level.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}