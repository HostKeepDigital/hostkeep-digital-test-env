import { jsPDF } from "npm:jspdf@4.0.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const STRIPE_FEE_PERCENTAGE = 1.5;
const STRIPE_FIXED_FEE = 0.20;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hostName, financialYearStart, financialYearEnd, bookings, cleaningJobs } = await req.json();

    // Fetch properties for mapping
    const properties = await base44.entities.Property.filter({ owner_id: user.id });
    const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p.title]));

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper to add new page if needed
    const checkNewPage = (requiredHeight = 30) => {
      if (yPos + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("FINANCIAL REPORT", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const startDate = new Date(financialYearStart);
    const endDate = new Date(financialYearEnd);
    doc.text(
      `${startDate.toLocaleDateString("en-GB")} to ${endDate.toLocaleDateString("en-GB")}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 6;
    doc.text(`Host: ${hostName}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Summary section
    const totalGross = bookings.reduce((sum, b) => sum + (b.subtotal || b.total_amount), 0);
    const totalStripeFees = bookings.reduce((sum, b) => {
      const subtotal = b.subtotal || b.total_amount;
      return sum + subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;
    }, 0);
    const totalCleanerPayments = cleaningJobs.reduce((sum, j) => sum + (j.cleaner_price || 0), 0);
    const netEarnings = totalGross - totalStripeFees - totalCleanerPayments;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("SUMMARY", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const summaryData = [
      ["Total Guest Bookings", bookings.length.toString()],
      ["Gross Revenue", `£${totalGross.toFixed(2)}`],
      ["Payment Security Fees", `-£${totalStripeFees.toFixed(2)}`],
      ["Cleaning Jobs", cleaningJobs.length.toString()],
      ["Cleaner Payments", `-£${totalCleanerPayments.toFixed(2)}`],
      ["NET INCOME", `£${netEarnings.toFixed(2)}`],
    ];

    summaryData.forEach((row) => {
      doc.setFont(undefined, row[0] === "NET INCOME" ? "bold" : "normal");
      doc.text(row[0], margin, yPos);
      doc.text(row[1], pageWidth - margin - 30, yPos, { align: "right" });
      yPos += 6;
    });

    yPos += 10;
    checkNewPage();

    // Booking Details
    if (bookings.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("BOOKING DETAILS", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      const tableStartY = yPos;
      doc.text("Guest", margin + 2, yPos);
      doc.text("Property", margin + 35, yPos);
      doc.text("Dates", margin + 80, yPos);
      doc.text("Nights", margin + 110, yPos);
      doc.text("Value", margin + 130, yPos);
      doc.text("Fees", margin + 160, yPos);
      doc.text("Net", pageWidth - margin - 15, yPos, { align: "right" });
      yPos += 6;

      // Line
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      doc.setFont(undefined, "normal");
      bookings.forEach((booking) => {
        checkNewPage(8);

        const startDate = new Date(booking.check_in);
        const endDate = new Date(booking.check_out);
        const nights = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const subtotal = booking.subtotal || booking.total_amount;
        const stripeFee = subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;
        const net = subtotal - stripeFee;

        const guestInitials = booking.guest_name
          .split(" ")
          .map((n) => n.charAt(0))
          .join("");
        const propertyName = propertyMap[booking.property_id] || "Property";
        const dateRange = `${startDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;

        doc.setFontSize(8);
        doc.text(guestInitials, margin + 2, yPos, { maxWidth: 30 });
        doc.text(propertyName.substring(0, 20), margin + 35, yPos, { maxWidth: 40 });
        doc.text(dateRange, margin + 80, yPos, { maxWidth: 25 });
        doc.text(nights.toString(), margin + 110, yPos);
        doc.text(`£${subtotal.toFixed(2)}`, margin + 130, yPos);
        doc.text(`-£${stripeFee.toFixed(2)}`, margin + 160, yPos);
        doc.text(`£${net.toFixed(2)}`, pageWidth - margin - 15, yPos, { align: "right" });

        yPos += 5;
      });

      yPos += 8;
      checkNewPage();
    }

    // Cleaner Payments
    if (cleaningJobs.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("CLEANER PAYMENTS", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Date", margin + 2, yPos);
      doc.text("Property", margin + 35, yPos);
      doc.text("Amount Paid", pageWidth - margin - 30, yPos, { align: "right" });
      yPos += 6;

      // Line
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      doc.setFont(undefined, "normal");
      cleaningJobs.forEach((job) => {
        checkNewPage(8);

        const jobDate = new Date(job.scheduled_date);
        const propertyName = propertyMap[job.property_id] || "Property";

        doc.setFontSize(8);
        doc.text(jobDate.toLocaleDateString("en-GB"), margin + 2, yPos);
        doc.text(propertyName.substring(0, 30), margin + 35, yPos, { maxWidth: 45 });
        doc.text(`-£${(job.cleaner_price || 0).toFixed(2)}`, pageWidth - margin - 30, yPos, { align: "right" });

        yPos += 5;
      });

      yPos += 8;
      checkNewPage();
    }

    // Final Summary
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("FINANCIAL SUMMARY", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const finalSummary = [
      ["Total Income (Guest Bookings)", `£${totalGross.toFixed(2)}`],
      ["Payment Processing Fees", `-£${totalStripeFees.toFixed(2)}`],
      ["Cleaner Payments", `-£${totalCleanerPayments.toFixed(2)}`],
      ["", ""],
      ["NET PROFIT / (LOSS)", `£${netEarnings.toFixed(2)}`],
    ];

    finalSummary.forEach((row) => {
      if (row[0] === "") {
        yPos += 2;
      } else {
        doc.setFont(undefined, row[0].includes("NET") ? "bold" : "normal");
        if (row[0].includes("NET")) {
          doc.setFontSize(11);
          doc.setTextColor(34, 197, 94); // Green
          const textWidth = doc.getTextWidth(row[0]);
          doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        } else {
          doc.setTextColor(0);
        }
        doc.text(row[0], margin, yPos);
        doc.text(row[1], pageWidth - margin - 20, yPos, { align: "right" });
        yPos += 6;
      }
    });

    // Footer
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-GB")} | HostKeep Financial Report`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Convert to base64
    const pdfBytes = doc.output("arraybuffer");
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});