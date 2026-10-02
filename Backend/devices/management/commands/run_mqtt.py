import logging

import paho.mqtt.client as mqtt
from django.conf import settings
from django.core.management.base import BaseCommand

from devices.services.mqtt_ingestion import (
    MQTTIngestionError,
    ingest_mqtt_message,
)

logger = logging.getLogger("smart_h2s.mqtt")


class Command(BaseCommand):
    help = "Run Smart H2S MQTT telemetry subscriber."

    def handle(self, *args, **options):
        broker_host = getattr(
            settings,
            "MQTT_BROKER_HOST",
            "broker.hivemq.com",
        )

        broker_port = getattr(
            settings,
            "MQTT_BROKER_PORT",
            1883,
        )

        topic = getattr(
            settings,
            "MQTT_TELEMETRY_TOPIC",
            "afyuadri/h2s-demo/a7c91f/device-001/telemetry",
        )

        client_id = getattr(
            settings,
            "MQTT_CLIENT_ID",
            "smart-h2s-django-backend",
        )

        client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=client_id,
        )

        client.on_connect = self.on_connect
        client.on_message = self.on_message
        client.on_disconnect = self.on_disconnect

        client.user_data_set(
            {
                "topic": topic,
            }
        )

        logger.info(
            "mqtt_subscriber_starting broker=%s port=%s topic=%s",
            broker_host,
            broker_port,
            topic,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Connecting to MQTT {broker_host}:{broker_port}")
        )

        try:
            client.connect(
                broker_host,
                broker_port,
                keepalive=60,
            )

            client.loop_forever()

        except KeyboardInterrupt:
            logger.info("mqtt_subscriber_stopped reason=keyboard_interrupt")

            self.stdout.write(self.style.WARNING("MQTT subscriber stopped."))

        except Exception:
            logger.exception("mqtt_subscriber_fatal_error")

            raise

        finally:
            try:
                client.disconnect()
            except Exception:
                logger.exception("mqtt_disconnect_failed")

    @staticmethod
    def on_connect(
        client,
        userdata,
        flags,
        reason_code,
        properties,
    ):
        topic = userdata["topic"]

        if reason_code == 0:
            logger.info(
                "mqtt_connected topic=%s",
                topic,
            )

            client.subscribe(
                topic,
                qos=0,
            )

            logger.info(
                "mqtt_subscribed topic=%s",
                topic,
            )

        else:
            logger.error(
                "mqtt_connect_failed reason_code=%s",
                reason_code,
            )

    @staticmethod
    def on_message(
        client,
        userdata,
        message,
    ):
        try:
            ingest_mqtt_message(
                topic=message.topic,
                raw_payload=message.payload,
            )

        except MQTTIngestionError:
            logger.exception(
                "mqtt_ingestion_failed topic=%s",
                message.topic,
            )

        except Exception:
            logger.exception(
                "mqtt_unexpected_message_error topic=%s",
                message.topic,
            )

    @staticmethod
    def on_disconnect(
        client,
        userdata,
        disconnect_flags,
        reason_code,
        properties,
    ):
        logger.warning(
            "mqtt_disconnected reason_code=%s",
            reason_code,
        )
