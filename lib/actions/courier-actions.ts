'use server';

import {
  getRiderActiveJobs,
  respondToDispatch,
  executeOperationalStep,
  submitRiderProofOfDelivery,
  reportRiderIssue,
  checkInRider,
  checkOutRider,
  updateRiderLocation,
} from './logistics-rider';

export async function fetchRiderActiveJobsAction() {
  return await getRiderActiveJobs();
}

export async function checkInRiderAction(params: {
  driverProfileId: string;
  latitude: number;
  longitude: number;
}) {
  return await checkInRider(params);
}

export async function checkOutRiderAction(params: { driverProfileId: string }) {
  return await checkOutRider(params);
}

export async function respondToDispatchAction(params: {
  dispatchId: string;
  action: 'ACCEPT' | 'REJECT';
  reason?: string;
}) {
  return await respondToDispatch(params);
}

export async function executeOperationalStepAction(params: {
  deliveryJobId: string;
  step: 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF';
}) {
  return await executeOperationalStep(params);
}

export async function submitRiderProofOfDeliveryAction(params: {
  deliveryJobId: string;
  type: 'OTP' | 'PIN' | 'PHOTO' | 'SIGNATURE';
  otp?: string;
}) {
  return await submitRiderProofOfDelivery(params);
}

export async function reportRiderIssueAction(params: {
  deliveryJobId: string;
  reason: 'RECIPIENT_UNAVAILABLE' | 'INCORRECT_ADDRESS' | 'PACKAGE_DAMAGED' | 'CUSTOMER_CANCELLED' | 'VEHICLE_BREAKDOWN' | 'OTHER';
  notes?: string;
}) {
  return await reportRiderIssue(params);
}
