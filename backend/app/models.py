from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


Point = tuple[float, float]


class Feature(BaseModel):
    id: str
    type: Literal["village", "farm", "clearing", "bridge", "truck", "landmark"]
    name: str
    position: Point
    description: str
    provenance: Literal["explicit", "assumed", "computed"]


class VehicleProfile(BaseModel):
    width_m: Annotated[float, Field(ge=1.5, le=4.0)] = 2.5
    height_m: Annotated[float, Field(ge=1.5, le=5.0)] = 3.2
    weight_t: Annotated[float, Field(ge=2.0, le=20.0)] = 8.5
    max_grade_percent: Annotated[float, Field(ge=4.0, le=35.0)] = 22.0


class SceneState(BaseModel):
    schema_version: Literal["1.0.0"] = "1.0.0"
    scene_id: Literal["hillside-relief-delivery"] = "hillside-relief-delivery"
    title: str = "Hillside Relief Delivery"
    revision: int = 1
    seed: int = 1847
    features: list[Feature]
    bridge_status: dict[Literal["main-bridge", "east-bridge"], bool]
    vehicle: VehicleProfile
    selected_destination: str | None = None
    assumptions: list[str]


class MoveFeature(BaseModel):
    type: Literal["MoveFeature"]
    feature_id: str
    north_delta_m: Annotated[float, Field(ge=-300, le=300)] = 0
    east_delta_m: Annotated[float, Field(ge=-300, le=300)] = 0


class SetBridgeStatus(BaseModel):
    type: Literal["SetBridgeStatus"]
    bridge_id: Literal["main-bridge", "east-bridge"]
    open: bool


class UpdateVehicle(BaseModel):
    type: Literal["UpdateVehicle"]
    values: dict[Literal["width_m", "height_m", "weight_t", "max_grade_percent"], float]


class ComputeRoute(BaseModel):
    type: Literal["ComputeRoute"]
    destination_id: Literal["clearing"] = "clearing"
    mode: Literal["strict", "exploratory"] = "exploratory"


class SetCamera(BaseModel):
    type: Literal["SetCamera"]
    bookmark: Literal["overview", "village", "clearing"]


class ResetScene(BaseModel):
    type: Literal["ResetScene"]


Command = MoveFeature | SetBridgeStatus | UpdateVehicle | ComputeRoute | SetCamera | ResetScene


class CommandEnvelope(BaseModel):
    base_revision: int
    commands: list[Command] = Field(discriminator="type", min_length=1, max_length=6)


class CommandRequest(BaseModel):
    scene: SceneState
    text: Annotated[str, Field(min_length=1, max_length=500)]
    base_revision: int
    mode: Literal["strict", "exploratory"] = "exploratory"


class RouteRequest(BaseModel):
    scene: SceneState
    mode: Literal["strict", "exploratory"] = "exploratory"


class LineOfSightRequest(BaseModel):
    start: Point
    end: Point
    start_height_m: Annotated[float, Field(ge=0, le=30)] = 2
    end_height_m: Annotated[float, Field(ge=0, le=30)] = 2


class ImportEnvelope(BaseModel):
    scene: SceneState

    @model_validator(mode="after")
    def supported_scene(self) -> "ImportEnvelope":
        if len(self.scene.features) > 100:
            raise ValueError("Scene contains too many features")
        return self
