from __future__ import annotations

from .models import Feature, SceneState, VehicleProfile


NODES = {
    "village-node": (-690.0, -625.0), "west-split": (-470.0, -520.0),
    "main-south": (-280.0, -455.0), "main-north": (-245.0, -235.0),
    "east-south": (405.0, -465.0), "east-north": (450.0, -230.0),
    "center": (80.0, -70.0), "farm-node": (-250.0, 540.0),
    "ridge-base": (500.0, 80.0), "clearing-node": (700.0, 230.0),
}


EDGES = [
    {"id":"village-track","name":"Village approach","from":"village-node","to":"west-split","points":[(-690,-625),(-590,-590),(-470,-520)],"surface":"graded track","width_m":4.6,"unknown":[]},
    {"id":"main-approach","name":"Main approach","from":"west-split","to":"main-south","points":[(-470,-520),(-375,-485),(-280,-455)],"surface":"graded track","width_m":4.2,"unknown":[]},
    {"id":"main-bridge-edge","name":"Main Bridge","from":"main-south","to":"main-north","points":[(-280,-455),(-270,-350),(-245,-235)],"surface":"stone bridge","width_m":3.8,"bridge_id":"main-bridge","capacity_t":12.0,"clearance_m":3.9,"unknown":[]},
    {"id":"main-center","name":"Orchard track","from":"main-north","to":"center","points":[(-245,-235),(-110,-155),(80,-70)],"surface":"farm track","width_m":3.7,"unknown":[]},
    {"id":"alternate-south","name":"Lower valley track","from":"west-split","to":"east-south","points":[(-470,-520),(-200,-565),(120,-540),(405,-465)],"surface":"graded track","width_m":4.0,"unknown":[]},
    {"id":"east-bridge-edge","name":"East Bridge","from":"east-south","to":"east-north","points":[(405,-465),(430,-350),(450,-230)],"surface":"timber bridge","width_m":3.5,"bridge_id":"east-bridge","clearance_m":3.5,"unknown":["Load capacity not documented"]},
    {"id":"east-center","name":"East bank track","from":"east-north","to":"center","points":[(450,-230),(300,-145),(80,-70)],"surface":"farm track","width_m":3.8,"unknown":[]},
    {"id":"center-ridge","name":"Ridge approach","from":"center","to":"ridge-base","points":[(80,-70),(230,-5),(380,35),(500,80)],"surface":"graded track","width_m":3.8,"unknown":[]},
    {"id":"ridge-clearing","name":"Clearing climb","from":"ridge-base","to":"clearing-node","points":[(500,80),(565,115),(625,165),(700,230)],"surface":"graded track","width_m":3.6,"unknown":[]},
    {"id":"farm-spur","name":"Farm spur","from":"center","to":"farm-node","points":[(80,-70),(-35,100),(-120,310),(-250,540)],"surface":"farm track","width_m":3.4,"unknown":["Wet-weather condition"]},
]


def seed_scene() -> SceneState:
    features = [
        Feature(id="village",type="village",name="Aster Village",position=(-720,-650),description="A compact southwest village beside the lower track.",provenance="explicit"),
        Feature(id="truck",type="truck",name="Relief truck",position=(-690,-625),description="A small civilian supply truck carrying relief goods.",provenance="explicit"),
        Feature(id="farm",type="farm",name="North Farm",position=(-260,560),description="Cultivated green plots north of the river.",provenance="explicit"),
        Feature(id="clearing",type="clearing",name="Ridge Clearing",position=(700,230),description="An open pad halfway up the eastern ridge.",provenance="explicit"),
        Feature(id="main-bridge",type="bridge",name="Main Bridge",position=(-260,-350),description="The direct stone crossing.",provenance="assumed"),
        Feature(id="east-bridge",type="bridge",name="East Bridge",position=(430,-350),description="A timber crossing with unverified capacity.",provenance="assumed"),
        Feature(id="ridge",type="landmark",name="Eastern Ridge",position=(710,320),description="Prominent eastern high ground.",provenance="computed"),
    ]
    return SceneState(
        features=features,
        bridge_status={"main-bridge":True,"east-bridge":True},
        vehicle=VehicleProfile(),
        assumptions=[
            "Terrain and road geometry are synthetic and illustrative.",
            "Configured vehicle limits are not manufacturer-verified.",
            "East Bridge load capacity is unknown and requires review.",
            "Visibility analysis considers terrain only.",
        ],
    )
