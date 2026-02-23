import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
import { Search, Plus, Filter, Users, Crown, Ban, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function HostGuests() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: () => base44.entities.Guest.filter({ deleted: false }),
  });

  const filteredGuests = guests.filter(guest => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      guest.full_name?.toLowerCase().includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || guest.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    standard: "bg-gray-100 text-gray-700",
    vip: "bg-purple-100 text-purple-700",
    blacklisted: "bg-red-100 text-red-700"
  };

  const statusIcons = {
    standard: null,
    vip: <Crown className="w-3 h-3" />,
    blacklisted: <Ban className="w-3 h-3" />
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Guests</h1>
            <p className="text-gray-500">{filteredGuests.length} guests</p>
          </div>
          <Link to={createPageUrl('GuestProfile') + "?new=true"}>
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
              <Plus className="w-4 h-4" />
              Add Guest
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
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
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Stays</TableHead>
                <TableHead>Last Stay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No guests found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests.map((guest) => (
                  <TableRow key={guest.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Link to={createPageUrl('GuestProfile') + `?id=${guest.id}`} className="font-medium text-gray-900 hover:text-teal-600 flex items-center gap-2">
                        {guest.full_name}
                        {guest.high_risk && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-600">{guest.email}</TableCell>
                    <TableCell className="text-gray-600">{guest.phone || "-"}</TableCell>
                    <TableCell className="text-center font-medium">{guest.total_stays}</TableCell>
                    <TableCell className="text-gray-600">
                      {guest.last_stay_date ? format(parseISO(guest.last_stay_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[guest.status]} flex items-center gap-1 w-fit`}>
                        {statusIcons[guest.status]}
                        {guest.status}
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