Patient:
(start Dispute Initiated)
Dispute charge
send Dispute Letter
(receive Explanation Letter)
(finish Patient Informed of Charge Confirmation)

Billing Specialist:
(receive Dispute Letter)
[db Billing System]
user Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review Invoice, Treatment Record, and Insurance Response
Is the charge correct?
Yes
[Explanation Letter]
send Explanation Letter
Close dispute
(finish Dispute Closed with Charge Confirmed)

Patient:
(start Dispute Initiated)
Dispute charge
send Dispute Letter
(receive Corrected Invoice)
(finish Patient Informed of Invoice Correction)

Billing Specialist:
(receive Dispute Letter)
[db Billing System]
user Open Patient Account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review Invoice, Treatment Record, and Insurance Response
Is the charge correct?
No
//Adjustments require documented justification
user Prepare Adjustment Form
[Adjustment Form]
user Update Billing System
[db Billing System]
service Issue Corrected Invoice
[Corrected Invoice]
send Corrected Invoice
(finish Dispute Resolved with Adjustment)