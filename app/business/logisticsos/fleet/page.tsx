import React from 'react';
import { db } from '@/src/prisma/db';
import { getFleetAndDrivers } from '@/lib/actions/logistics-fleet';
import { Card, Badge, Button } from '@/components/Shared';
import { Car, User, Plus, MapPin, Truck, Key, Activity, BadgeCheck, AlertCircle, Users } from 'lucide-react';

export default async function FleetDriversPage() {
  const provider = await db.orm.public.Organization.where({ type: 'LOGISTICS' }).first() || 
                   await db.orm.public.Organization.all().first();

  if (!provider) {
    return <div className="p-10 text-center text-slate-500">No organizations found.</div>;
  }

  const { vehicles, drivers } = await getFleetAndDrivers(provider.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fleet & Drivers</h1>
          <p className="text-slate-500 mt-1">Manage vehicles and dispatch personnel</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Vehicle</Button>
          <Button variant="primary"><User className="w-4 h-4 mr-2" /> Onboard Driver</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Drivers Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Active Drivers ({drivers.length})
          </h2>
          
          <div className="space-y-4">
            {drivers.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No drivers onboarded yet.</p>
              </Card>
            ) : (
              drivers.map((driver: any) => (
                <Card key={driver.id} className="hover:border-teal-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                        {driver.person?.firstName?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{driver.person?.firstName} {driver.person?.lastName}</h3>
                        <p className="text-xs text-slate-500">{driver.person?.email}</p>
                      </div>
                    </div>
                    <Badge variant={driver.status === 'ONLINE' ? 'default' : 'outline'} className={driver.status === 'ONLINE' ? 'bg-teal-50 text-teal-700 border-teal-200' : ''}>
                      {driver.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Vehicle</span>
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3" />
                        {driver.currentVehicle?.licensePlate || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Onboarding</span>
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                        {driver.onboardingComplete ? <BadgeCheck className="w-3 h-3 text-teal-500" /> : <AlertCircle className="w-3 h-3 text-orange-500" />}
                        {driver.onboardingComplete ? 'Verified' : 'Pending Docs'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Fleet Vehicles ({vehicles.length})
          </h2>
          
          <div className="space-y-4">
            {vehicles.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <Car className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No vehicles in fleet.</p>
              </Card>
            ) : (
              vehicles.map(vehicle => (
                <Card key={vehicle.id} className="hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 font-mono tracking-wider">{vehicle.licensePlate}</h3>
                        <p className="text-xs text-slate-500 font-medium">{vehicle.type}</p>
                      </div>
                    </div>
                    <Badge variant={vehicle.status === 'ACTIVE' ? 'default' : 'outline'}>
                      {vehicle.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payload Cap</span>
                      <span className="text-sm font-medium text-slate-700 mt-0.5">
                        {vehicle.capacityPayload ? `${vehicle.capacityPayload} kg` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Volume Cap</span>
                      <span className="text-sm font-medium text-slate-700 mt-0.5">
                        {vehicle.capacityVolume ? `${vehicle.capacityVolume} m3` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

