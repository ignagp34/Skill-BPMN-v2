Patient:
(start Charge disputed)
send Dispute letter
receive Explanation letter
(finish Dispute resolved with explanation)

Patient:
(start Charge disputed)
send Dispute letter
receive Corrected invoice
(finish Dispute resolved with corrected invoice)

Billing Specialist:
(receive Dispute letter)
[db Billing System]
user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review invoice, treatment record, and insurance response
Is the charge correct?
Yes
send Explanation letter
user Close dispute
(finish Dispute closed)

Billing Specialist:
(receive Dispute letter)
[db Billing System]
user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review invoice, treatment record, and insurance response
Is the charge correct?
No
//Adjustments require documented justification
user Prepare adjustment form
[Adjustment Form]
user Update billing system
[db Billing System]
user Issue corrected invoice
[Corrected Invoice]
send Corrected invoice
(finish Corrected invoice sent)