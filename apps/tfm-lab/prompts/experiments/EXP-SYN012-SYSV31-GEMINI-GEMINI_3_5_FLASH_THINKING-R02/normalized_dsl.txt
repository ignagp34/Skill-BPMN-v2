Patient:
send Dispute Letter

Billing Specialist:
(receive Dispute Letter)
[db Billing System]
Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
Review Invoice and Records
Is the charge correct?
Yes
send Explanation Letter
Close Dispute

Patient:
(receive Explanation Letter)

Patient:
send Dispute Letter

Billing Specialist:
(receive Dispute Letter)
[db Billing System]
Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
Review Invoice and Records
Is the charge correct?
No
//Adjustments require documented justification
Prepare Adjustment Form
[Adjustment Form]
Update Billing System
[db Billing System]
Issue Corrected Invoice
[Corrected Invoice]
send Corrected Invoice

Patient:
(receive Corrected Invoice)