import { AppointmentRepository } from '../repositories/appointment.repository';

export class AppointmentDataService {
  private repo = new AppointmentRepository();

  async getById(id: string | number) {
    const list = await this.repo.getAll();
    const searchIdStr = String(id);
    return list.find((a: any) => String(a.id) === searchIdStr || a.testId === searchIdStr);
  }

  async getAll() {
    const sqlAppointments = await this.repo.getAll();
    return sqlAppointments.map((dbApp: any) => ({
      id: dbApp.id,
      testId: dbApp.testId,
      name: dbApp.name,
      phone: dbApp.phone,
      age: dbApp.age,
      testName: dbApp.testName,
      location: dbApp.location,
      testerName: dbApp.testerName || 'غير محدد',
      date: dbApp.date,
      time: dbApp.time,
      locationUrl: dbApp.locationUrl || '',
      status: dbApp.status || 'جديد',
      price: dbApp.price,
      amountCollected: dbApp.amountCollected,
      arrivalTime: dbApp.arrivalTime || null,
      completionTime: dbApp.completionTime || null,
      notes: dbApp.notes || '',
      requiresFasting: dbApp.requiresFasting || false,
      priceDiffReason: dbApp.priceDiffReason || '',
      attachmentUrl: dbApp.attachmentUrl || '',
      timeline: dbApp.timeline || [],
      auditTrail: dbApp.auditTrail || [],
      paymentStatus: dbApp.paymentStatus || 'غير مدفوع',
      priority: dbApp.priority || 'عادي',
      insurance: dbApp.insurance || 'لا يوجد',
      paymentMethod: dbApp.paymentMethod || 'نقدي',
      lastVisit: dbApp.lastVisit || '-',
      isExternalRequest: dbApp.isExternalRequest || false,
      isPendingAcceptance: dbApp.isPendingAcceptance || false,
      createdAt: dbApp.createdAt ? (dbApp.createdAt instanceof Date ? dbApp.createdAt.toISOString() : new Date(dbApp.createdAt).toISOString()) : new Date().toISOString()
    }));
  }

  async save(appointmentData: any) {    return await this.repo.save(appointmentData);
  }

  async updateStatus(id: string | number, status: string, additionalData?: any) {
    const appt = await this.getById(id);
    if (!appt) return false;
    
    await this.repo.updateStatus(appt.id, status);
    
    const cleanData = Object.fromEntries(
      Object.entries(additionalData || {}).filter(
        ([_, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ''
      )
    );

    if (Object.keys(cleanData).length > 0) {
      await this.repo.update(appt.id, cleanData);
    }
    return true;
  }

  async update(id: string | number, data: any) {
    const appt = await this.getById(id);
    if (!appt) return false;
    return await this.repo.update(appt.id, data);
  }

  async delete(id: string | number) {
    const appt = await this.getById(id);
    if (!appt) return false;
    await this.repo.delete(appt.id);
    return true;
  }

  async getAuditTrail() {
    const active = await this.getAll();
    const logs: any[] = [];
    active.forEach((appt: any) => {
      if (appt.auditTrail && Array.isArray(appt.auditTrail)) {
        appt.auditTrail.forEach((log: any) => {
          logs.push({
            ...log,
            appointmentId: appt.id,
            patientName: appt.name,
            testName: appt.testName,
            appointmentDate: appt.date,
            isDeleted: false
          });
        });
      }
    });

    return logs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }
}
