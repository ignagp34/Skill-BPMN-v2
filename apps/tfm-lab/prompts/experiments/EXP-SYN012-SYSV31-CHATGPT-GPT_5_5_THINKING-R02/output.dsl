Patient: send Dispute Letter

[Dispute Letter]
Billing Specialist: receive Dispute Letter
[db Billing System]
Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Review billing documentation
Is charge correct?
Yes
send Explanation Letter
Close dispute

[Dispute Letter]
Billing Specialist: receive Dispute Letter
[db Billing System]
Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
Review billing documentation
Is charge correct?
No
//Adjustments require documented justification
Prepare adjustment form
[Adjustment Form]
[db Billing System]
Update billing system
Issue corrected invoice
[Corrected Invoice]
send Corrected Invoice

Patient:
(receive Explanation Letter)

Patient:
(receive Corrected Invoice)
