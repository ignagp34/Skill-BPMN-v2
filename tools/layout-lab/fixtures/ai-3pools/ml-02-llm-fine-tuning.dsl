Product Manager: (start New assistant feature requested)
Product Manager: Write feature brief
(send Fine-tuning request)
(receive Release notes)
Product Manager: Announce feature to customers
(finish Feature launched)

ML Engineer: (receive Fine-tuning request)
ML Engineer: Curate instruction dataset
[Instruction dataset]
ML Engineer: Configure training run
(send Training job)
(receive Trained checkpoint)
ML Engineer: Run benchmark suite|Safety Reviewer: Run red-teaming session
Safety Reviewer: Decide release readiness
Is the checkpoint safe and accurate?
Yes
ML Engineer: Publish model version
(send Release notes)

ML Engineer: (receive Fine-tuning request)
ML Engineer: Curate instruction dataset
ML Engineer: Configure training run
(send Training job)
(receive Trained checkpoint)
ML Engineer: Run benchmark suite|Safety Reviewer: Run red-teaming session
Safety Reviewer: Decide release readiness
Is the checkpoint safe and accurate?
No
ML Engineer: Add counterexamples to dataset
ML Engineer: Configure training run

GPU Cluster: (receive Training job)
service Provision GPU nodes
service Train model on distributed GPUs
service Save checkpoint to object storage
(send Trained checkpoint)

...
GPU Cluster: service Train model on distributed GPUs
((deadline 48 hours))
GPU Cluster: send Notify capacity delay
(finish Delay reported)

== pools ==
Product Team -> Product Manager
AI Lab -> ML Engineer; Safety Reviewer
Cloud Provider -> GPU Cluster
