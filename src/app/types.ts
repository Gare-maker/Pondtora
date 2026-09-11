/* ─── Types ────────────────────────────────────────────────── */
export type View = "financial" | "ponds" | "inventory" | "documentation" | "invoices" | "staff" | "reports" | "assessments" | "pricing" | "notifications" | "settings";
export type SortDir = "asc" | "desc";

export interface MonthData { month:string; revenue:number; expenses:number; feedCost:number; stockCost:number; maintenance:number; labor:number; utilities:number; overhead:number; }
export interface FeedItem  { id:string; brand:string; size:string; bags:number; weightPerBag:number; totalKg:number; costPerBag:number; supplier:string; purchaseDate:string; month:string; farmId?:string; }
export interface Pond      { id:string; name:string; type:string; species:string; sizeM2:string; initialStock:number; currentCount:number; avgWeight?:number; stockingDate:string; stockMonth:string; totalCost:number; status:"Active"|"Empty"; notes:string; transferNote?:string; farmId:string; lengthFt?:string; widthFt?:string; defaultPellet?:string; category?:"Production"|"Nursery"; maxKgByPallet?:Record<string,number>; supplier?:string; }
export interface EditEntry { originalAmount:number; updatedAmount:number; originalDate:string; updatedDate:string; originalDesc:string; updatedDesc:string; editedAt:string; editedBy:string; editedById:string; }
export interface Expense   { id:string; category:string; amount:number; date:string; month:string; year:number; pond:string; desc:string; originalDesc?:string; fishStock?:string; farmId?:string; createdBy?:string; createdById?:string; editHistory?:EditEntry[]; }
export interface Revenue   { id:string; source:string; amount:number; date:string; month:string; year:number; notes:string; originalNotes?:string; pond?:string; stockBatch?:string; farmId?:string; fishStock?:string; createdBy?:string; createdById?:string; editHistory?:EditEntry[]; }
export interface FeedEditEntry { originalMorning:number; updatedMorning:number; originalEvening:number; updatedEvening:number; editedAt:string; editedBy:string; editedById:string; }
export interface FeedingRecord { id:string; date:string; month:string; year:number; pond:string; brand:string; size:string; morning:number; evening:number; total:number; recordedBy:string; morningTime?:string; eveningTime?:string; createdBy?:string; createdById?:string; farmId?:string; editHistory?:FeedEditEntry[]; }
export interface MortalityEntry { id:string; pondId:string; date:string; count:number; cause:string; notes:string; farmId?:string; }
export interface BagOpenLog    { id:string; date:string; month:string; year:number; brand:string; size:string; kgPerBag:number; bagsOpened:number; totalKg:number; fishStock?:string; farmId?:string; }
export interface FeedRemainingLog { id:string; brand:string; size:string; fishStock:string; remainingKg:number; date:string; farmId?:string; }
export interface StaffMember  { id:string; name:string; email:string; phone:string; role:string; status:"Active"|"Pending"; joinedDate:string; permissions:string[]; farms:string[]; }
export interface Report       { id:string; title:string; content:string; type:"Daily"|"Weekly"|"Monthly"; author:string; date:string; status:"Open"|"Resolved"; resolvedBy?:string; resolvedDate?:string; tags:string[]; timestamp?:string; farmId?:string; }
export interface UserProfile  { id?:string; name:string; farmName:string; city:string; state:string; country:string; email:string; phone:string; currencySymbol:string; currencyCode:string; activePlan?:string|null; trialStartDate?:string|null; role?:string; }
export interface StockEvent   { id:string; pondId:string; pondName:string; date:string; species:string; count:number; avgWeight?:number; cost:number; salePrice?:number; type:"Initial"|"Transfer"|"Restock"|"Closed"; fromPond?:string; clearedDate?:string; supplier?:string; farmId?:string; }
export interface PriceGroup   { id:string; group:string; displayName:string; description:string; pricePerKg:number; status:"Active"|"Inactive"; farmId?:string; }
export interface Customer     { id:string; name:string; phone:string; email:string; businessName:string; address:string; farmId?:string; }
export interface InvSettings  { farmName:string; farmAddress:string; farmPhone:string; farmEmail:string; bankDetails:string; defaultNotes:string; footerMessage:string; taxRate:number; invoicePrefix:string; paymentTerms:string; }
export interface InvoiceLineItem { id:string; groupId:string; groupLabel:string; displayName:string; qtyKg:number; pricePerKg:number; discount:number; lineTotal:number; }
export interface Invoice      { id:string; invNumber:string; customer:Customer; pond:string; species:string; items:InvoiceLineItem[]; discountType:"invoice"|"item"; subtotal:number; discount:number; additionalCharges:number; grandTotal:number; amountPaid:number; outstanding:number; status:"Draft"|"Sent"|"Pending"|"Partially Paid"|"Paid"|"Overdue"|"Cancelled"|"Error"; paymentMethod:string; invoiceDate:string; dueDate:string; notes:string; issuedBy?:string; farmId?:string; }
export interface Farm         { id:string; name:string; city:string; state:string; country:string; }
export interface TreatmentRecord { id:string; pondId:string; farmId:string; date:string; cause:string; medicine:string; remarks:string; }
export type WItem = {id:string;groupId:string;qty:string;discount:string;};
