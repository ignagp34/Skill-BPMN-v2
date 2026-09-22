Patient:
Dispute charge
(send dispute letter)
(receive explanation letter)

Patient:
Dispute charge
(send dispute letter)
(receive corrected invoice)

Billing Specialist:
(receive dispute letter)
[db Billing System]
Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Review invoice, treatment record, and insurance response
Is charge correct?
Yes
(send explanation letter)
Close dispute

Billing Specialist:
(receive dispute letter)
[db Billing System]
Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Review invoice, treatment record, and insurance response
Is charge correct?
No
//Adjustments require documented justification
Prepare adjustment form
[Adjustment Form]
[db Billing System]
Update billing system
[Corrected Invoice]
Issue corrected invoice
(send corrected invoice)