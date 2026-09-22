(start Charge dispute received)
[Dispute Letter]
Billing Specialist: receive Receive dispute letter
[db Billing System]
Billing Specialist: user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Billing Specialist: user Review billing documents
Is charge confirmed as correct?
Yes
Billing Specialist: send Send explanation letter
Billing Specialist: user Close dispute
(finish Patient informed and dispute closed)

(start Charge dispute received)
[Dispute Letter]
Billing Specialist: receive Receive dispute letter
[db Billing System]
Billing Specialist: user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Billing Specialist: user Review billing documents
Is charge confirmed as correct?
No
//Adjustments require documented justification
Billing Specialist: user Prepare adjustment form
[Adjustment Form]
[db Billing System]
Billing Specialist: service Update billing system
Billing Specialist: user Issue corrected invoice
[Corrected Invoice]
Billing Specialist: send Send corrected invoice to patient
(finish Patient informed with corrected invoice)