from datetime import datetime
from django.conf import settings
import requests
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.utils import timezone

from crm.utils import generate_verification_token
from plan.models import *
from crm.models import *
from django.core.mail import send_mail
from django.urls import reverse


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile = Profile.objects.create(user=instance)
        if instance.is_superuser:
            Role.objects.get_or_create(user=profile,
                                       role_type='admin',
                                       content_type=None,
                                       object_id=None)
        else:
            Role.objects.get_or_create(user=profile,
                                       role_type='projectant',
                                       content_type=None,
                                       object_id=None)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_save, sender=User)
def assign_email_address(sender, instance, **kwargs):
    if instance.email and not Contact.objects.filter(data=instance.email).exists():
        Contact.objects.create(profile=Profile.objects.get(user=instance), type="Почта", data=instance.email, )


@receiver(post_save, sender=Contact)
def send_verification_email(sender, instance, created, **kwargs):
    if created and not instance.is_verified and not instance.profile.user.is_superuser:
        instance.verified_token = generate_verification_token()
        instance.token_created_at = timezone.now()
        instance.save()
        verification_url = reverse('verify-email') + f'?token={instance.verified_token}'
        full_url = f"https://crm.meetuppoint.ru{verification_url}"

        send_mail(
            'Подтверждение email',
            f'Перейдите по ссылке для подтверждения: {full_url}',
            'no-reply@meetuppoint.ru',
            recipient_list=[instance.data],
            fail_silently=False,
        )


@receiver(post_save, sender=Application)
def handle_status_change(sender, instance, created, **kwargs):
    if kwargs.get('created'):
        return

    new_status = instance.status

    status = Status_order.objects.get(status=new_status)
    function_order = FunctionOrder.objects.filter(status_order=status).order_by('position').select_related('robot',
                                                                                                           'trigger')

    # Обрабатываем все триггеры
    for func in function_order:
        if func.type_function == "robot":
            # print("robot runs")
            execute_robot(func, instance)
        elif func.type_function == "trigger":
            check_trigger(func, instance)


def execute_robot(function_order, application):
    """Выполнение действия, связанного с роботом"""

    # Загрузка конфигурации из JSON
    # config = json.loads(function_order.config)
    config = function_order.config
    # Определение типа действия робота
    if function_order.robot.type_action == "move_status":
        # Вызов функции изменения статуса
        result, message = move_application_status(
            application.id,
            config['target_status']
        )
    if function_order.robot.type_action == "send_tg":
        result, message = send_message_tg(
            application.id,
            config['text']
        )


def check_trigger(function_order, application):
    """Проверка условий триггера"""

    # Загрузка конфигурации триггера
    # config = json.loads(function_order.config)
    config = function_order.config

    # Определение обработчика для типа триггера
    # handler = {
    #     "time_expiration": check_time_trigger,
    #     "status_check": check_status_trigger,
    #     "field_comparison": check_field_trigger
    # }.get(function_order.trigger.type_condition)

    # Проверка условия триггера
    # condition_met, _ = handler(application, config)

    # if condition_met:
    #     # Запуск связанных действий при выполнении условия
    #     execute_robot(function_order, application)


def move_application_status(application_id: int, new_status_name: str):
    """Асинхронно изменяет статус заявки и запускает связанные действия"""
    try:
        # Атомарная транзакция для обеспечения целостности данных

        # Получение объекта заявки
        application = Application.objects.get(id=application_id)
        # Получение нового статуса
        new_status = Status.objects.get(name=new_status_name)

        # Обновление статуса заявки
        application.status = new_status
        application.save()

        # Запуск обработки связанных функций
        return True, "Статус успешно изменен"
    except Status.DoesNotExist:
        # Обработка отсутствия статуса
        return False, f"Статус {new_status_name} не найден"
    except Exception as e:
        # Общая обработка ошибок
        return False, f"Ошибка: {str(e)}"


def send_message_tg(application_id: int, text: str):
    url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage'
    try:
        application = Application.objects.get(id=application_id)
        chat_id = Contact.objects.get(profile=application.user, type="ТГ").data
        requests.post(url, json={'chat_id': chat_id, 'text': text})
        return True, "Статус успешно изменен"
    except Contact.DoesNotExist:
        # Обработка отсутствия чата
        return False, f"Чат не найден"
    except Exception as e:
        # Общая обработка ошибок
        return False, f"Ошибка: {str(e)}"
