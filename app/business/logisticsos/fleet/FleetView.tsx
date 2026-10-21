'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from '@/components/Shared';
import { Car, User, Plus, Truck, BadgeCheck, AlertCircle, Users, Check, X } from 'lucide-react';
import { registerVehicle, onboardDriver } from '@/lib/actions/logistics-fleet';

interface FleetViewProps {
  providerId: string;
  providerName: string;
  initialVehicles: any[];
  initialDrivers: any[];
}

export default function FleetView({
  providerId,
  providerName,
  initialVehicles,
  initialDrivers,
}: FleetViewProps) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [drivers, setDrivers] = useState(initialDrivers);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vehicle Form State
  const [vehicleType, setVehicleType] = useState('MOTORCYCLE');
  const [licensePlate, setLicensePlate] = useState('');
  const [payloadCap, setPayloadCap] = useState('');
  const [volumeCap, setVolumeCap] = useState('');

  // Driver Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const newVeh = await registerVehicle({
        providerId,
        type: vehicleType,
        licensePlate,
        capacityPayload: payloadCap ? parseFloat(payloadCap) : undefined,
        capacityVolume: volumeCap ? parseFloat(volumeCap) : undefined,
      });
      setVehicles([newVeh, ...vehicles]);
      setShowVehicleModal(false);
      setLicensePlate('');
      setPayloadCap('');
      setVolumeCap('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const newDriver = await onboardDriver({
        providerId,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        vehicleId: selectedVehicleId || undefined,
      });

      // Find vehicle for display
      const assignedVeh = vehicles.find((v) => v.id === selectedVehicleId);
      const enrichedDriver = {
        ...newDriver,
        person: { firstName, lastName, email, phone },
        currentVehicle: assignedVeh,
      };

      setDrivers([enrichedDriver, ...drivers]);
      setShowDriverModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setSelectedVehicleId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to onboard driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fleet & Drivers</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{providerName}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowVehicleModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
          <Button variant="primary" onClick={() => setShowDriverModal(true)}>
            <User className="w-4 h-4 mr-2" /> Onboard Driver
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
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
                        <p className="text-xs text-slate-500">{driver.person?.phone || driver.person?.email || 'No contact'}</p>
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
                        <Truck className="w-3 h-3 text-slate-400" />
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
              vehicles.map((vehicle: any) => (
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
                        {vehicle.capacityVolume ? `${vehicle.capacityVolume} m³` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Register New Vehicle</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterVehicle} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="MOTORCYCLE">Motorcycle / Bike</option>
                  <option value="CAR">Car</option>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">License Plate</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAL-849-XA"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Payload (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={payloadCap}
                    onChange={(e) => setPayloadCap(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 0.5"
                    value={volumeCap}
                    onChange={(e) => setVolumeCap(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowVehicleModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Register Vehicle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Onboard Dispatch Rider</h3>
              <button onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleOnboardDriver} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Tari"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Rider"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+2348000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="rider@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Assign Initial Vehicle (Optional)</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Unassigned</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowDriverModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Onboarding...' : 'Complete Onboarding'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
