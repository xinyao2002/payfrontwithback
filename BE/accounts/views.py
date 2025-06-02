from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from django.conf import settings
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.models import User
from django.http import JsonResponse

def get_user_id(request):
    username = request.GET.get("username")
    try:
        user = User.objects.get(username=username)
        return JsonResponse({"user_id": user.id})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            first_name = data.get('first_name', '')
            last_name = data.get('last_name', '')

            if User.objects.filter(username=username).exists():
                return JsonResponse({'error': 'Username already taken'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'error': 'Email already taken'}, status=400)

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            return JsonResponse({'message': 'User registered successfully'})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Only POST method allowed'}, status=405)


@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return JsonResponse({'error': 'Invalid email or password'}, status=401)

            # Verify password
            user = authenticate(username=user.username, password=password)
            if user is not None:
                login(request, user)
                # Ensure session is saved
                request.session.save()
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                    }
                })
            else:
                return JsonResponse({'error': 'Invalid email or password'}, status=401)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Only POST method allowed'}, status=405)


token_generator = PasswordResetTokenGenerator()

@csrf_exempt
def forgot_password(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            user = User.objects.filter(email=email).first()

            if not user:
                return JsonResponse({'error': 'User with this email does not exist'}, status=404)

            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)

            frontend_url = 'http://localhost:3000' 
            reset_link = f"{frontend_url}/reset-password?uid={uidb64}&token={token}"

            subject = "Reset Your PayPay Password"
            message = f"Hi {user.username},\n\nClick the link below to reset your password:\n\n{reset_link}"
            from_email = settings.DEFAULT_FROM_EMAIL
            send_mail(subject, message, from_email, [email], fail_silently=False)

            return JsonResponse({'message': 'Password reset link has been sent'})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Only POST method allowed'}, status=405)

@csrf_exempt
def reset_password(request, uidb64, token):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)

    try:
        data = json.loads(request.body)
        password = data.get('password')

        if not password or len(password) < 6:
            return JsonResponse({'error': 'Password must be at least 6 characters'}, status=400)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return JsonResponse({'error': 'Invalid user ID'}, status=400)

        if not token_generator.check_token(user, token):
            return JsonResponse({'error': 'Invalid or expired token'}, status=400)

   
        user.set_password(password)
        user.save()

        return JsonResponse({'message': 'Password has been reset successfully'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'user': {
                "id": request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            }
        })
    return JsonResponse({'authenticated': False}, status=401)
