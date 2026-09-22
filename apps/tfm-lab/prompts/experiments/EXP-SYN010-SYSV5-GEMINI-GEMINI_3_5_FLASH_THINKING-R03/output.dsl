Buyer: (start Purchase initiated)
Create purchase order
...

...
Buyer: Create purchase order
(send Purchase Order)
(receive Order Confirmation)
Accept order
(finish Order Confirmed)

...
Buyer: Create purchase order
(send Purchase Order)
(receive Revised Offer)
user Review revised offer
...

...
Buyer: user Review revised offer
Accept revised offer?
Yes
Prepare acceptance
(send Acceptance)
(receive Final Confirmation)
Accept order
(finish Order Confirmed)

...
Buyer: user Review revised offer
Accept revised offer?
No
Prepare rejection
(send Rejection)
(finish Order Rejected)

Supplier: (receive Purchase Order)
Check stock availability
...

...
Supplier: Check stock availability
Is stock available?
Yes
Prepare order confirmation
(send Order Confirmation)
(finish Order Confirmed)

...
Supplier: Check stock availability
Is stock available?
No
Prepare revised offer
(send Revised Offer)
...

...
Supplier: Prepare revised offer
(send Revised Offer)
(receive Acceptance)
Prepare final confirmation
(send Final Confirmation)
(finish Order Confirmed)

...
Supplier: Prepare revised offer
(send Revised Offer)
(receive Rejection)
Close order request
(finish Order Request Closed)

== pools ==
Buyer Pool -> Buyer
Supplier Pool -> Supplier
