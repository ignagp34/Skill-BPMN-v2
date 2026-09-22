Patient:
[Invoice]
send Dispute Letter
receive Explanation Letter

Patient:
[Invoice]
send Dispute Letter
receive Corrected Invoice

Billing Specialist:
[Dispute Letter]
(receive Dispute Letter)
[db Billing System]
Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
Review Invoice, Treatment Record, and Insurance Response
Is the charge correct?
Yes
[Explanation Letter]
send Explanation Letter
Close Dispute

Billing Specialist:
[Dispute Letter]
(receive Dispute Letter)
[db Billing System]
Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
Review Invoice, Treatment Record, and Insurance Response
Is the charge correct?
No
[Adjustment Form]
//Adjustments require documented justification
Prepare Adjustment Form
[db Billing System]
Update Billing System
[Corrected Invoice]
Issue Corrected Invoice
send Corrected Invoice