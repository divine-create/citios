import CategoryView from './CategoryView';
import RideHailingView from './RideHailingView';
import { Phone, Building, Calendar, Package, Car } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRideOrgs } from '@/lib/actions/resident';

export function EducationView({ setView }: any) {
    return <CategoryView setView={setView} title="Find Schools" filters={["Public", "Private", "Under 5km", "Primary"]} items={[
        { name: "Lincoln High School", badge: "Notice", badgeVariant: "alert", rating: "4.8", dist: "1.2 km", address: "800 Education Way", img: "22", tags: ["Public", "High School", "STEM"], primaryAction: "View Profile", secondaryAction: "Contact" },
        { name: "St. Jude Primary", badge: "Enrolling", badgeVariant: "default", rating: "4.9", dist: "3.4 km", address: "120 Saint Jude St", img: "24", tags: ["Private", "Primary", "Arts"], primaryAction: "Enroll Now", secondaryAction: "Schedule Tour" }
    ]} mapImageId="42" mapWidget={
        <div className="absolute top-1/2 left-2/3 w-12 h-12 bg-teal-800 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
            <Building className="w-5 h-5" />
        </div>
    } />
}

export function GroceryView({ setView }: any) {
    return <CategoryView setView={setView} title="Grocery & Supermarkets" filters={["Open Now", "Delivery", "Organic"]} items={[
        { name: "Central Grocers", badge: "Open", badgeVariant: "default", rating: "4.7", dist: "0.5 km", address: "14 Main St", img: "48", tags: ["Fresh Produce", "Bakery"], primaryAction: "Order Delivery", secondaryAction: "Click & Collect" },
        { name: "FreshMart Organic", badge: "Busy", badgeVariant: "alert", rating: "4.5", dist: "2.1 km", address: "290 Valley Rd", img: "50", tags: ["Organic", "Wholesale"], primaryAction: "Order Delivery", secondaryAction: "View Weekly Ad" }
    ]} mapImageId="43" mapWidget={
        <div className="absolute top-1/3 left-1/4 w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
        </div>
    } />
}

export function EventsView({ setView }: any) {
    return <CategoryView setView={setView} title="Local Events" filters={["This Weekend", "Free", "Family Friendly"]} items={[
        { name: "City Festival 2024", badge: "Tomorrow", badgeVariant: "alert", rating: "4.9", dist: "2.0 km", address: "Central Park", img: "64", tags: ["Music", "Food", "Free"], primaryAction: "Get Tickets", secondaryAction: "Share" },
        { name: "Local Farmers Market", badge: "Saturday", badgeVariant: "default", rating: "4.8", dist: "4.1 km", address: "Town Square", img: "65", tags: ["Organic", "Local Craft"], primaryAction: "RSVP", secondaryAction: "Directions" }
    ]} mapImageId="44" mapWidget={
        <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-teal-800 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
        </div>
    } />
}

export function RentalsView({ setView }: any) {
    return <CategoryView setView={setView} title="Properties & Rentals" filters={["Apartments", "Under $2000", "Pet Friendly"]} items={[
        { name: "Oak Ridge Apartments", badge: "Available", badgeVariant: "default", rating: "4.6", dist: "1.5 km", address: "400 Oak Lane", img: "73", tags: ["2 Bed", "Pool", "Gym"], primaryAction: "Schedule Tour", secondaryAction: "Apply" },
        { name: "Downtown Lofts", badge: "Waitlist", badgeVariant: "alert", rating: "4.8", dist: "0.2 km", address: "89 Center Ave", img: "74", tags: ["Studio", "Rooftop"], primaryAction: "Join Waitlist", secondaryAction: "Contact" }
    ]} mapImageId="45" mapWidget={
        <div className="absolute top-2/3 left-1/3 w-12 h-12 bg-teal-800 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
            <Building className="w-5 h-5" />
        </div>
    } />
}

export function ServicesView({ setView }: any) {
    return <CategoryView setView={setView} title="Local Services" filters={["Plumbers", "Electricians", "Cleaning", "Top Rated"]} items={[
        { name: "QuickFix Plumbing", badge: "Available", badgeVariant: "default", rating: "4.9", dist: "3.0 km", address: "Servicing Downtown", img: "83", tags: ["24/7", "Licensed"], primaryAction: "Book Now", secondaryAction: "Call" },
        { name: "Spark Electric", badge: "Busy", badgeVariant: "alert", rating: "4.7", dist: "5.2 km", address: "Servicing Metro Area", img: "84", tags: ["Residential", "Commercial"], primaryAction: "Request Quote", secondaryAction: "Call" }
    ]} mapImageId="46" mapWidget={
        <div className="absolute top-1/4 left-3/4 w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
            <Phone className="w-5 h-5" />
        </div>
    } />
}

export function CityRideView({ setView }: any) {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRideOrgs().then(data => {
            setOrgs(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col h-full w-full items-center justify-center p-8 bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
                <p className="text-gray-600">Loading ride providers...</p>
            </div>
        );
    }

    return <RideHailingView setView={setView} organizations={orgs} />;
}
