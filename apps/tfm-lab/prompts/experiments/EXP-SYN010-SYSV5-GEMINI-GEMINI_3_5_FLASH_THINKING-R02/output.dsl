Buyer:
(start Purchase initiated)
Create purchase order
(send Purchase Order)
(receive Order Confirmation)
Accept order
(finish Order Accepted)

Buyer:
(start Purchase initiated)
Create purchase order
(send Purchase Order)
(receive Revised Offer)
Review revised offer
Accept revised offer?
Yes
(send Acceptance)
(receive Final Confirmation)
Accept order
(finish Order Accepted)

Buyer:
(start Purchase initiated)
Create purchase order
(send Purchase Order)
(receive Revised Offer)
Review revised offer
Accept revised offer?
No
(send Rejection)
(finish Order Rejected)

Supplier:
(receive Purchase Order)
Check stock availability
Are all items available?
Yes
(send Order Confirmation)
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
Check stock availability
Are all items available?
No
(send Revised Offer)
(receive Acceptance)
(send Final Confirmation)
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
Check stock availability
Are all items available?
No
(send Revised Offer)
(receive Rejection)
Close order request
(finish Request Closed)

== pools ==
Buyer Pool -> Buyer
Supplier Pool -> Supplier
